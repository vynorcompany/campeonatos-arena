import { lockAvailableBookingServices, BookingServiceUnavailableError } from "./booking-services";
import type { ArenaTransaction } from "@/lib/rls";
import { activeCourtOccurrenceWhere } from "@/lib/calendar/online-booking-hold";
import { arenaWallClockToInstant } from "@/lib/calendar/arena-wall-clock";

export async function finalizePaidCourtBooking(tx: ArenaTransaction, arenaId: string, occurrenceId: string) {
  const booking = await tx.scheduleOccurrence.findFirst({
    where: { id: occurrenceId, arenaId, sourceType: "ONLINE_BOOKING" },
    select: { id: true, status: true, startsAt: true, endsAt: true, notes: true, serviceReservations: { select: { productId: true } }, arena: { select: { slug: true } }, occurrenceCourts: { select: { courtId: true, court: { select: { name: true } } } }, participants: { select: { playerId: true } } },
  });
  if (!booking || booking.status === "SCHEDULED") return false;
  const courtIds = booking.occurrenceCourts.map((court) => court.courtId).sort();
  for (const courtId of courtIds) {
    await tx.$queryRaw`SELECT "id" FROM "Court" WHERE "id" = ${courtId} AND "arenaId" = ${arenaId} FOR UPDATE`;
  }
  await tx.$queryRaw`SELECT "id" FROM "ScheduleOccurrence" WHERE "id" = ${occurrenceId} AND "arenaId" = ${arenaId} FOR UPDATE`;
  const current = await tx.scheduleOccurrence.findFirst({ where: { id: occurrenceId, arenaId, sourceType: "ONLINE_BOOKING" }, select: { status: true } });
  if (!current || current.status === "SCHEDULED") return false;
  const conflict = current.status === "PENDING_PAYMENT" && courtIds.length ? await tx.scheduleOccurrence.findFirst({
    where: { arenaId, id: { not: occurrenceId }, ...activeCourtOccurrenceWhere(), startsAt: { lt: booking.endsAt }, endsAt: { gt: booking.startsAt }, occurrenceCourts: { some: { courtId: { in: courtIds } } } },
    select: { id: true },
  }) : null;
  let serviceConflict = false;
  if (current.status === "PENDING_PAYMENT" && booking.serviceReservations?.length) {
    try { await lockAvailableBookingServices(tx, arenaId, booking.serviceReservations.map(service => service.productId), booking.startsAt, booking.endsAt, { excludeOccurrenceId: occurrenceId, requireVisible: false, courtIds }); }
    catch (error) { if (error instanceof BookingServiceUnavailableError) serviceConflict = true; else throw error; }
  }
  if (current.status !== "PENDING_PAYMENT" || conflict || serviceConflict || !courtIds.length || arenaWallClockToInstant(booking.startsAt) <= new Date()) {
    await tx.scheduleOccurrence.update({ where: { id: occurrenceId }, data: { status: "CANCELED", notes: `${booking.notes}\nPagamento recebido sem confirmação da reserva. Verificar atendimento/reembolso.`.trim() } });
    const courtName = booking.occurrenceCourts[0]?.court.name ?? "Quadra";
    await tx.arenaNotification.create({ data: { arenaId, type: "ONLINE_BOOKING_PAYMENT_REVIEW", title: "Pagamento de reserva precisa de atendimento", message: `Pagamento recebido para ${courtName}, mas o horário não pôde ser confirmado. Verifique a cobrança e providencie atendimento ou reembolso.`, href: "/agenda" } });
    await tx.playerNotification.createMany({ data: booking.participants.map(({ playerId }) => ({ playerId, type: "ONLINE_BOOKING_PAYMENT_REVIEW", title: "Pagamento em análise", message: "Recebemos o pagamento, mas sua reserva não pôde ser confirmada. A arena entrará em contato para resolver ou reembolsar.", href: `/home?arena=${encodeURIComponent(booking.arena.slug)}&section=booking` })) });
    return false;
  }
  await tx.scheduleOccurrence.update({ where: { id: occurrenceId }, data: { status: "SCHEDULED" } });
  return true;
}
