import type { Prisma } from "@prisma/client";

/** Deletion and its receipt either commit together or both roll back. */
export async function deleteComandaWithAudit(
  tx: Prisma.TransactionClient,
  auth: { arenaId: string; userId: string; userName: string },
  comandaId: string,
) {
  await tx.$queryRaw`SELECT id FROM "Comanda" WHERE id = ${comandaId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
  const comanda = await tx.comanda.findFirst({
    where: { id: comandaId, arenaId: auth.arenaId, status: "OPEN" },
    include: { items: { select: { productId: true, quantity: true, totalCents: true } } },
  });
  if (!comanda) throw new Error("A comanda não está disponível para exclusão.");
  await tx.comanda.delete({ where: { id: comanda.id, arenaId: auth.arenaId } });
  await tx.auditEvent.create({ data: {
    arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName,
    action: "COMANDA_DELETED", entityId: comanda.id,
    details: { code: comanda.code, label: comanda.label, playerId: comanda.playerId, items: comanda.items,
      totalCents: comanda.items.reduce((total, item) => total + item.totalCents, 0) },
  } });
}
