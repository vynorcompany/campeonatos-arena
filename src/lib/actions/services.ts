"use server";
import { revalidatePath } from "next/cache";
import { requireModuleEdit } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { STANDARD_SERVICES } from "@/lib/calendar/standard-services";
import { peakServiceOccupancy } from "@/lib/calendar/service-capacity";
import { activeCourtOccurrenceWhere } from "@/lib/calendar/online-booking-hold";
import { instantToArenaWallClock } from "@/lib/calendar/arena-wall-clock";
import { serviceBookingRulesSchema, readServiceBookingRules } from "@/lib/calendar/service-booking-rules";
import { z } from "zod";

const schema = z.object({
  id: z.string().optional(),
  bookingConcurrentLimit: z.coerce.number().int().min(1).max(1000).default(1),
  name: z.string().trim().min(2, "Informe o nome do serviço.").max(120),
  price: z.string().trim().regex(/^\d+(?:\.\d{3})*(?:,\d{1,2})?$/, "Informe um valor válido, como 40,00.")
});
export async function saveServiceAction(form: FormData) {
  const auth = await requireModuleEdit("stock");
  const input = schema.safeParse({ id: form.get("id") || undefined, name: form.get("name"), price: form.get("price"), bookingConcurrentLimit: form.get("bookingConcurrentLimit") || undefined });
  if (!input.success) throw new Error(input.error.issues[0]?.message ?? "Serviço inválido.");
  const bookingRules = serviceBookingRulesSchema.parse(JSON.parse(String(form.get("bookingRules") || "{}")));
  const priceCents = Math.round(Number(input.data.price.replace(/\./g, "").replace(",", ".")) * 100);
  if (!Number.isSafeInteger(priceCents) || priceCents > 2_147_483_647) throw new Error("Valor acima do limite permitido.");
  await withArenaTransaction(auth.arenaId, async tx => {
    if (input.data.id) await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${input.data.id} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const current = input.data.id ? await tx.product.findFirst({ where: { id: input.data.id, arenaId: auth.arenaId, isService: true, serviceDeletedAt: null }, select: { id: true, name: true, sku: true, bookingConcurrentLimit: true } }) : null;
    if (input.data.id && !current) throw new Error("Serviço não encontrado.");
    const standard = STANDARD_SERVICES.find(item => current?.sku === `ARENA-SERVICE:${item.code}`);
    if (standard && form.get("serviceHourly") === "on") throw new Error("Serviços padrão são cobrados por atleta.");
    if (standard && input.data.name !== current?.name) throw new Error("O nome deste serviço padrão é fixo.");
    if (!standard && ["liga", "super 12", "aula", "aula fixa", "plano", "reserva", "reserva fixa"].includes(input.data.name.toLocaleLowerCase("pt-BR"))) throw new Error("Este nome já é utilizado por um tipo padrão da grade.");
    if (current && input.data.bookingConcurrentLimit < current.bookingConcurrentLimit) {
      const now = instantToArenaWallClock(new Date());
      const reserved = await tx.scheduleServiceReservation.findMany({ where: { arenaId: auth.arenaId, productId: current.id, occurrence: { ...activeCourtOccurrenceWhere(), endsAt: { gt: now } } }, select: { occurrence: { select: { startsAt: true, endsAt: true } } } });
      const windows = reserved.map(({ occurrence }) => ({ start: occurrence.startsAt.getTime(), end: occurrence.endsAt.getTime() }));
      const peak = peakServiceOccupancy(windows, now.getTime(), Math.max(now.getTime(), ...windows.map(window => window.end)) + 1);
      if (peak > input.data.bookingConcurrentLimit) throw new Error(`Há ${peak} reservas simultâneas já registradas para este serviço. Ajuste essas reservas antes de reduzir o limite.`);
    }
    if (bookingRules.courtIds.length) {
      const count = await tx.court.count({ where: { arenaId: auth.arenaId, id: { in: [...new Set(bookingRules.courtIds)] } } });
      if (count !== new Set(bookingRules.courtIds).size) throw new Error("Selecione quadras desta arena.");
    }
    const data = { bookingRules, name: input.data.name, priceCents, serviceHourly: form.get("serviceHourly") === "on", showOnPortalBooking: form.get("showOnPortalBooking") === "on", bookingConcurrentLimit: input.data.bookingConcurrentLimit, showOnAgenda: form.get("showOnAgenda") === "on", showOnComandas: form.get("showOnComandas") === "on", updatedByUserId: auth.userId };
    const duplicate = await tx.product.findFirst({ where: { arenaId: auth.arenaId, name: { equals: data.name, mode: "insensitive" }, ...(input.data.id ? { id: { not: input.data.id } } : {}) }, select: { id: true } });
    if (duplicate) throw new Error("Já existe um produto ou serviço com este nome.");
    if (input.data.id) {
      const service = await tx.product.findFirst({ where: { id: input.data.id, arenaId: auth.arenaId, isService: true, serviceDeletedAt: null }, select: { id: true } });
      if (!service) throw new Error("Serviço não encontrado.");
      await tx.product.update({ where: { id: service.id }, data });
      if (standard) await tx.arenaServicePrice.upsert({ where: { arenaId_serviceCode: { arenaId: auth.arenaId, serviceCode: standard.code } }, create: { arenaId: auth.arenaId, serviceCode: standard.code, priceCents, updatedByUserId: auth.userId }, update: { priceCents, updatedByUserId: auth.userId } });
    } else await tx.product.create({ data: { ...data, arenaId: auth.arenaId, isService: true, createdByUserId: auth.userId } });
  });
  for (const path of ["/pdv/servicos", "/agenda", "/comandas", "/home"]) revalidatePath(path);
}

export async function manageServiceAction(form: FormData) {
  const auth = await requireModuleEdit("stock");
  const input = z.object({ id: z.string().min(1), operation: z.enum(["duplicate", "activate", "deactivate", "delete"]) }).parse({ id: form.get("id"), operation: form.get("operation") });
  await withArenaTransaction(auth.arenaId, async tx => {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${input.id} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const service = await tx.product.findFirst({ where: { id: input.id, arenaId: auth.arenaId, isService: true, serviceDeletedAt: null } });
    if (!service) throw new Error("Serviço não encontrado.");
    if (service.sku.startsWith("ARENA-SERVICE:") && input.operation !== "duplicate") throw new Error("Serviços padrão da grade não podem ser excluídos ou inativados.");
    if (input.operation === "duplicate") {
      const base = service.name.slice(0, 100);
      let name = `${base} (cópia)`;
      for (let n = 2; await tx.product.findFirst({ where: { arenaId: auth.arenaId, name: { equals: name, mode: "insensitive" } }, select: { id: true } }); n++) name = `${base} (cópia ${n})`;
      await tx.product.create({ data: { arenaId: auth.arenaId, name, isService: true, serviceHourly: service.serviceHourly, priceCents: service.priceCents, costCents: service.costCents, categoryId: service.categoryId, showOnAgenda: service.showOnAgenda, showOnComandas: service.showOnComandas, showOnPortalBooking: service.showOnPortalBooking, bookingConcurrentLimit: service.bookingConcurrentLimit, bookingRules: readServiceBookingRules(service.bookingRules), createdByUserId: auth.userId, updatedByUserId: auth.userId } });
    } else if (input.operation === "delete") {
      const used = await tx.product.findUniqueOrThrow({ where: { id: service.id }, select: { _count: { select: { saleItems: true, comandaItems: true, comandaRequests: true, stockMovements: true, fiscalDocumentItems: true, serviceReservations: true } } } });
      if (Object.values(used._count).some(count => count > 0)) {
        await tx.product.update({ where: { id: service.id }, data: { serviceDeletedAt: new Date(), active: false, showOnAgenda: false, showOnComandas: false, showOnPortalBooking: false, updatedByUserId: auth.userId } });
      } else await tx.product.delete({ where: { id: service.id } });
    } else await tx.product.update({ where: { id: service.id }, data: { active: input.operation === "activate", updatedByUserId: auth.userId } });
    await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName, action: `SERVICE_${input.operation.toUpperCase()}`, entityId: service.id, details: { name: service.name } } });
  });
  for (const path of ["/pdv/servicos", "/agenda", "/comandas", "/home"]) revalidatePath(path);
}
