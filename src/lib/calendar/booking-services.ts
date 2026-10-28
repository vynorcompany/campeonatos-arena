import { servicePriceCents } from "@/lib/products/service-pricing";
import { Prisma } from "@prisma/client";
import type { ArenaTransaction } from "@/lib/rls";
import { activeCourtOccurrenceWhere } from "./online-booking-hold";
import { peakServiceOccupancy } from "./service-capacity";

export class BookingServiceUnavailableError extends Error {}

/** Lock shared equipment across courts before checking or committing its reservation. */
export async function lockAvailableBookingServices(tx: ArenaTransaction, arenaId: string, productIds: readonly string[], startsAt: Date, endsAt: Date, options: { excludeOccurrenceId?: string; requireVisible?: boolean } = {}) {
  if (!productIds.length) return [];
  const ids = [...new Set(productIds)].sort();
  if (ids.length !== productIds.length || ids.length > 12) throw new BookingServiceUnavailableError("Seleção de serviços inválida.");
  await tx.$queryRaw`SELECT id FROM "Product" WHERE "arenaId" = ${arenaId} AND id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
  const services = await tx.product.findMany({ where: { arenaId, id: { in: ids }, isService: true, ...(options.requireVisible !== false ? { active: true, showOnPortalBooking: true } : {}) }, select: { id: true, name: true, priceCents: true, serviceHourly: true, bookingConcurrentLimit: true }, orderBy: { id: "asc" } });
  if (services.length !== ids.length) throw new BookingServiceUnavailableError("Um dos serviços selecionados não está disponível para esta arena.");
  for (const service of services) {
    const reservations = await tx.scheduleServiceReservation.findMany({ where: { arenaId, productId: service.id, ...(options.excludeOccurrenceId ? { occurrenceId: { not: options.excludeOccurrenceId } } : {}), occurrence: { ...activeCourtOccurrenceWhere(), startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } }, select: { occurrence: { select: { startsAt: true, endsAt: true } } } });
    const busy = reservations.map(({ occurrence }) => ({ start: occurrence.startsAt.getTime(), end: occurrence.endsAt.getTime() }));
    if (peakServiceOccupancy(busy, startsAt.getTime(), endsAt.getTime()) >= service.bookingConcurrentLimit) throw new BookingServiceUnavailableError(`${service.name} não está disponível neste horário. Escolha outro período ou retire o serviço.`);
    if (service.priceCents < 0) throw new BookingServiceUnavailableError("Um dos serviços está com o valor indisponível. Consulte a arena.");
  }
  return services.map(service => ({ productId: service.id, serviceName: service.name, priceCents: servicePriceCents(service.priceCents, service.serviceHourly, Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000)) }));
}
