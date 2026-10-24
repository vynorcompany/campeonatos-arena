import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { STANDARD_SERVICES } from "@/lib/calendar/standard-services";

export async function syncStandardServiceCatalog(tx: Prisma.TransactionClient, arenaId: string, serviceCode: string, priceCents: number, userId: string) {
  const service = STANDARD_SERVICES.find(item => item.code === serviceCode);
  if (!service) throw new Error("Serviço inválido.");
  const sku = `ARENA-SERVICE:${serviceCode}`;
  const existing = await tx.product.findFirst({ where: { arenaId, isService: true, sku }, select: { id: true } });
  if (existing) return tx.product.update({ where: { id: existing.id }, data: { priceCents, updatedByUserId: userId } });
  const collision = await tx.product.findUnique({ where: { arenaId_name: { arenaId, name: service.name } }, select: { id: true } });
  const id = randomUUID();
  return tx.product.create({ data: { id, arenaId, name: collision ? `${service.name} · serviço ${id.slice(0, 8)}` : service.name, sku, isService: true, showOnAgenda: true, showOnComandas: true, priceCents, createdByUserId: userId, updatedByUserId: userId } });
}
