import type { ArenaTransaction } from "@/lib/rls";

type FinancialEntryRelations = {
  supplierId?: string | null;
  bankAccountId?: string | null;
  planId?: string | null;
  productId?: string | null;
  playerId?: string | null;
};

// Foreign keys reference simple IDs; the entry's arenaId alone does not keep
// a submitted relation from pointing to a record owned by another arena.
export async function assertFinancialEntryRelationsBelongToArena(
  tx: ArenaTransaction,
  arenaId: string,
  relations: FinancialEntryRelations,
) {
  if (relations.supplierId && !await tx.supplier.findFirst({ where: { id: relations.supplierId, arenaId }, select: { id: true } })) {
    throw new Error("Fornecedor não encontrado nesta arena.");
  }
  if (relations.bankAccountId && !await tx.bankAccount.findFirst({ where: { id: relations.bankAccountId, arenaId }, select: { id: true } })) {
    throw new Error("Conta bancária não encontrada nesta arena.");
  }
  if (relations.planId && !await tx.plan.findFirst({ where: { id: relations.planId, arenaId }, select: { id: true } })) {
    throw new Error("Plano não encontrado nesta arena.");
  }
  if (relations.productId && !await tx.product.findFirst({ where: { id: relations.productId, arenaId }, select: { id: true } })) {
    throw new Error("Produto não encontrado nesta arena.");
  }
  if (relations.playerId && !await tx.player.findFirst({ where: { id: relations.playerId, arenaId }, select: { id: true } })) {
    throw new Error("Cliente não encontrado nesta arena.");
  }
}
