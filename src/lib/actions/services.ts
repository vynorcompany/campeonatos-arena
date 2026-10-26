"use server";
import { revalidatePath } from "next/cache";
import { requireModuleEdit } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { STANDARD_SERVICES } from "@/lib/calendar/standard-services";
import { peakServiceOccupancy } from "@/lib/calendar/service-capacity";
import { activeCourtOccurrenceWhere } from "@/lib/calendar/online-booking-hold";
import { instantToArenaWallClock } from "@/lib/calendar/arena-wall-clock";
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
  const priceCents = Math.round(Number(input.data.price.replace(/\./g, "").replace(",", ".")) * 100);
  if (!Number.isSafeInteger(priceCents) || priceCents > 2_147_483_647) throw new Error("Valor acima do limite permitido.");
  await withArenaTransaction(auth.arenaId, async tx => {
    if (input.data.id) await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${input.data.id} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const current = input.data.id ? await tx.product.findFirst({ where: { id: input.data.id, arenaId: auth.arenaId, isService: true }, select: { id: true, name: true, sku: true, bookingConcurrentLimit: true } }) : null;
    if (input.data.id && !current) throw new Error("Serviço não encontrado.");
    const standard = STANDARD_SERVICES.find(item => current?.sku === `ARENA-SERVICE:${item.code}`);
    if (standard && input.data.name !== current?.name) throw new Error("O nome deste serviço padrão é fixo.");
    if (!standard && ["liga", "super 12", "aula", "aula fixa", "plano", "reserva", "reserva fixa"].includes(input.data.name.toLocaleLowerCase("pt-BR"))) throw new Error("Este nome já é utilizado por um tipo padrão da grade.");
    if (current && input.data.bookingConcurrentLimit < current.bookingConcurrentLimit) {
      const now = instantToArenaWallClock(new Date());
      const reserved = await tx.scheduleServiceReservation.findMany({ where: { arenaId: auth.arenaId, productId: current.id, occurrence: { ...activeCourtOccurrenceWhere(), endsAt: { gt: now } } }, select: { occurrence: { select: { startsAt: true, endsAt: true } } } });
      const windows = reserved.map(({ occurrence }) => ({ start: occurrence.startsAt.getTime(), end: occurrence.endsAt.getTime() }));
      const peak = peakServiceOccupancy(windows, now.getTime(), Math.max(now.getTime(), ...windows.map(window => window.end)) + 1);
      if (peak > input.data.bookingConcurrentLimit) throw new Error(`Há ${peak} reservas simultâneas já registradas para este serviço. Ajuste essas reservas antes de reduzir o limite.`);
    }
    const data = { name: input.data.name, priceCents, showOnPortalBooking: form.get("showOnPortalBooking") === "on", bookingConcurrentLimit: input.data.bookingConcurrentLimit, showOnAgenda: form.get("showOnAgenda") === "on", showOnComandas: form.get("showOnComandas") === "on", updatedByUserId: auth.userId };
    const duplicate = await tx.product.findFirst({ where: { arenaId: auth.arenaId, name: { equals: data.name, mode: "insensitive" }, ...(input.data.id ? { id: { not: input.data.id } } : {}) }, select: { id: true } });
    if (duplicate) throw new Error("Já existe um produto ou serviço com este nome.");
    if (input.data.id) {
      const service = await tx.product.findFirst({ where: { id: input.data.id, arenaId: auth.arenaId, isService: true }, select: { id: true } });
      if (!service) throw new Error("Serviço não encontrado.");
      await tx.product.update({ where: { id: service.id }, data });
      if (standard) await tx.arenaServicePrice.upsert({ where: { arenaId_serviceCode: { arenaId: auth.arenaId, serviceCode: standard.code } }, create: { arenaId: auth.arenaId, serviceCode: standard.code, priceCents, updatedByUserId: auth.userId }, update: { priceCents, updatedByUserId: auth.userId } });
    } else await tx.product.create({ data: { ...data, arenaId: auth.arenaId, isService: true, createdByUserId: auth.userId } });
  });
  for (const path of ["/pdv/servicos", "/agenda", "/comandas", "/home"]) revalidatePath(path);
}
