import type { Prisma } from "@prisma/client";

export async function calculateBankAccountBalanceCents(
  tx: Pick<Prisma.TransactionClient, "financialEntry" | "financialSettlement">,
  arenaId: string,
  bankAccountId: string,
  openingBalanceCents: number,
) {
  const base = { arenaId, bankAccountId, status: { not: "VOIDED" } };
  const revenueTypes = { in: ["REVENUE", "INCOME"] };
  const [received, paid, legacyReceived, legacyPaid] = await Promise.all([
    tx.financialSettlement.aggregate({ where: { arenaId, financialEntry: { ...base, type: revenueTypes } }, _sum: { amountCents: true } }),
    tx.financialSettlement.aggregate({ where: { arenaId, financialEntry: { ...base, type: "EXPENSE" } }, _sum: { amountCents: true } }),
    tx.financialEntry.aggregate({ where: { ...base, status: "PAID", type: revenueTypes, settlements: { none: {} } }, _sum: { amountCents: true } }),
    tx.financialEntry.aggregate({ where: { ...base, status: "PAID", type: "EXPENSE", settlements: { none: {} } }, _sum: { amountCents: true } }),
  ]);
  return openingBalanceCents
    + (received._sum.amountCents ?? 0) + (legacyReceived._sum.amountCents ?? 0)
    - (paid._sum.amountCents ?? 0) - (legacyPaid._sum.amountCents ?? 0);
}
