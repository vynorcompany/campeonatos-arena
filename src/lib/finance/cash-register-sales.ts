import type { ArenaTransaction } from "@/lib/rls";

export async function recordCashSaleIfOpen(
  tx: ArenaTransaction,
  input: { arenaId: string; referenceDate: Date; amountCents: number; description: string; createdByName: string },
) {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) throw new Error("Valor em dinheiro inválido.");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const register = await tx.cashRegister.findFirst({
      where: { arenaId: input.arenaId, referenceDate: input.referenceDate, status: "OPEN" },
      orderBy: { openedAt: "desc" },
      select: { id: true },
    });
    if (!register) return false;

    // UPDATE waits for a concurrent close and rechecks OPEN before touching the
    // balance. The movement and balance update commit (or roll back) together.
    const updated = await tx.cashRegister.updateMany({
      where: { id: register.id, arenaId: input.arenaId, referenceDate: input.referenceDate, status: "OPEN" },
      data: { expectedAmountCents: { increment: input.amountCents } },
    });
    if (!updated.count) continue;

    await tx.cashMovement.create({ data: {
      arenaId: input.arenaId,
      registerId: register.id,
      type: "SALE",
      amountCents: input.amountCents,
      description: input.description,
      createdByName: input.createdByName,
    } });
    return true;
  }
  return false;
}
