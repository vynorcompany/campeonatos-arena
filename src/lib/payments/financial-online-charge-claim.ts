import { requireReceivingBankAccount } from "@/lib/finance/receiving-bank-account";
import type { ArenaTransaction } from "@/lib/rls";
import { getFinancialEntryBalance } from "@/lib/finance/ledger";
import { hasExistingOnlineCharge } from "@/lib/payments/existing-online-charge";

const claimLeaseMs = 60_000;
type Method = "PIX" | "BOLETO";

export async function claimFinancialOnlineCharge(tx: ArenaTransaction, input: {
  arenaId: string;
  entryId: string;
  method: Method;
  expectedAmountCents: number;
  discountCents?: number;
  interestCents?: number;
  quotedAmountCents?: number;
  bankAccountId?: string;
  now?: Date;
  requireActiveBoletoRecurrence?: boolean;
}): Promise<{ ok: true; claimedAt: Date; amountCents: number } | { ok: false; error: string }> {
  const locked = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "FinancialEntry"
    WHERE "id" = ${input.entryId} AND "arenaId" = ${input.arenaId}
    FOR UPDATE
  `;
  if (!locked.length) return { ok: false, error: "Lançamento a receber não encontrado." };
  const entry = await tx.financialEntry.findFirst({
    where: {
      id: input.entryId, arenaId: input.arenaId, type: "REVENUE", status: input.requireActiveBoletoRecurrence ? "PENDING" : { in: ["PENDING", "OVERDUE", "PARTIAL"] },
      ...(input.requireActiveBoletoRecurrence ? { recurrence: { active: true, onlinePaymentMethod: "BOLETO" } } : {}),
    },
    include: { settlements: { select: { amountCents: true, interestCents: true, discountCents: true } } },
  });
  if (!entry) return { ok: false, error: input.requireActiveBoletoRecurrence
    ? "O lançamento não está mais pendente ou a recorrência foi encerrada."
    : "O lançamento não está mais pendente." };
  if (hasExistingOnlineCharge(entry)) return { ok: false, error: "Este lançamento já possui uma cobrança online. Use ‘Ver cobrança’ para consultá-la." };
  if (getFinancialEntryBalance(entry.amountCents, entry.settlements).outstandingCents !== input.expectedAmountCents) {
    return { ok: false, error: "O saldo do lançamento mudou. Atualize a página antes de gerar a cobrança." };
  }
  const discountCents = input.discountCents ?? 0, interestCents = input.interestCents ?? 0;
  if (![discountCents, interestCents].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 2_147_483_647) || discountCents > input.expectedAmountCents) return { ok: false, error: "Revise o desconto e os juros da cobrança." };
  const amountCents = input.expectedAmountCents - discountCents + interestCents;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 2_147_483_647) return { ok: false, error: amountCents === 0 ? "O desconto zera o saldo. Confirme a baixa sem gerar cobrança online." : "Valor da cobrança inválido." };
  if (input.method === "BOLETO" && amountCents < 500) return { ok: false, error: "Boleto exige valor mínimo de R$ 5,00 após o desconto." };
  if (input.quotedAmountCents !== undefined && input.quotedAmountCents !== amountCents) return { ok: false, error: "Para cobrar online, informe o saldo integral com o desconto e os juros. Atualize os valores antes de gerar a cobrança." };
  if (entry.onlinePaymentClaimMethod && ((entry.onlineChargeAmountCents !== null && entry.onlineChargeAmountCents !== amountCents) || entry.onlineChargeDiscountCents !== discountCents || entry.onlineChargeInterestCents !== interestCents)) return { ok: false, error: "Esta cobrança já foi iniciada com outros valores. Confira no Mercado Pago antes de alterar desconto ou juros." };
  if (entry.onlinePaymentClaimMethod && entry.onlinePaymentClaimMethod !== input.method) {
    return { ok: false, error: "Outro meio de pagamento já foi iniciado para este lançamento. Confira a cobrança no Mercado Pago antes de trocar o método." };
  }
  const now = input.now ?? new Date();
  if (entry.onlinePaymentClaimedAt && entry.onlinePaymentClaimedAt.getTime() > now.getTime() - claimLeaseMs) {
    return { ok: false, error: "A emissão desta cobrança já está em andamento. Aguarde um minuto e tente novamente." };
  }
  let bankAccountId: string;
  try { bankAccountId = await requireReceivingBankAccount(tx, input.arenaId, input.bankAccountId ?? entry.bankAccountId); }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Selecione a conta bancária." }; }
  if (entry.onlinePaymentClaimMethod && entry.bankAccountId && entry.bankAccountId !== bankAccountId) return { ok: false, error: "Esta cobrança já foi iniciada em outra conta bancária. Confira a cobrança antes de alterar a conta." };
  await tx.financialEntry.update({
    where: { id: entry.id },
    // Register the provider before its callback can arrive. The webhook uses
    // this marker plus the arena-scoped external reference to find the entry.
    data: { ...(bankAccountId ? { bankAccountId } : {}), onlineProvider: "MERCADO_PAGO", onlinePaymentClaimMethod: input.method, onlinePaymentClaimedAt: now, onlineChargeAmountCents: amountCents, onlineChargeDiscountCents: discountCents, onlineChargeInterestCents: interestCents },
  });
  return { ok: true, claimedAt: now, amountCents };
}
