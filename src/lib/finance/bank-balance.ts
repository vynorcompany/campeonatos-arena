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
    tx.financialSettlement.aggregate({ where: { arenaId, financialEntry: { arenaId, status: { not: "VOIDED" }, type: revenueTypes }, OR: [{ bankAccountId }, { bankAccountId: null, financialEntry: { bankAccountId } }] }, _sum: { amountCents: true } }),
    tx.financialSettlement.aggregate({ where: { arenaId, financialEntry: { arenaId, status: { not: "VOIDED" }, type: "EXPENSE" }, OR: [{ bankAccountId }, { bankAccountId: null, financialEntry: { bankAccountId } }] }, _sum: { amountCents: true } }),
    tx.financialEntry.aggregate({ where: { ...base, status: "PAID", type: revenueTypes, settlements: { none: {} } }, _sum: { amountCents: true } }),
    tx.financialEntry.aggregate({ where: { ...base, status: "PAID", type: "EXPENSE", settlements: { none: {} } }, _sum: { amountCents: true } }),
  ]);
  return openingBalanceCents
    + (received._sum.amountCents ?? 0) + (legacyReceived._sum.amountCents ?? 0)
    - (paid._sum.amountCents ?? 0) - (legacyPaid._sum.amountCents ?? 0);
}

/** Bank balances may be negative; reject malformed text rather than treating it as zero. */
export function parseBankBalanceCents(value: string) {
  const text = value.trim().replace(/^(-?)R\$\s*/, "$1").replace(/\s/g, "");
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text) && !/^-?\d+\.\d{1,2}$/.test(text)) {
    throw new Error("Informe um saldo válido, por exemplo 1.250,50 ou -250,00.");
  }
  const normalized = text.includes(",") || /^-?\d{1,3}(?:\.\d{3})+$/.test(text) ? text.replace(/\./g, "").replace(",", ".") : text;
  const cents = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(cents) || Math.abs(cents) > 2_147_483_647) throw new Error("O saldo informado ultrapassa o limite permitido.");
  return cents;
}
