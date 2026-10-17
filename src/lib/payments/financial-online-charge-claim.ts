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
  now?: Date;
  requireActiveBoletoRecurrence?: boolean;
}): Promise<{ ok: true; claimedAt: Date } | { ok: false; error: string }> {
  const locked = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "FinancialEntry"
    WHERE "id" = ${input.entryId} AND "arenaId" = ${input.arenaId}
    FOR UPDATE
  `;
  if (!locked.length) return { ok: false, error: "Lançamento a receber não encontrado." };
  const entry = await tx.financialEntry.findFirst({
    where: {
      id: input.entryId, arenaId: input.arenaId, type: "REVENUE", status: "PENDING",
      ...(input.requireActiveBoletoRecurrence ? { recurrence: { active: true, onlinePaymentMethod: "BOLETO" } } : {}),
    },
    include: { settlements: { select: { amountCents: true, interestCents: true } } },
  });
  if (!entry) return { ok: false, error: input.requireActiveBoletoRecurrence
    ? "O lançamento não está mais pendente ou a recorrência foi encerrada."
    : "O lançamento não está mais pendente." };
  if (hasExistingOnlineCharge(entry)) return { ok: false, error: "Este lançamento já possui uma cobrança online. Use ‘Ver cobrança’ para consultá-la." };
  if (getFinancialEntryBalance(entry.amountCents, entry.settlements).outstandingCents !== input.expectedAmountCents) {
    return { ok: false, error: "O saldo do lançamento mudou. Atualize a página antes de gerar a cobrança." };
  }
  if (entry.onlinePaymentClaimMethod && entry.onlinePaymentClaimMethod !== input.method) {
    return { ok: false, error: "Outro meio de pagamento já foi iniciado para este lançamento. Confira a cobrança no Mercado Pago antes de trocar o método." };
  }
  const now = input.now ?? new Date();
  if (entry.onlinePaymentClaimedAt && entry.onlinePaymentClaimedAt.getTime() > now.getTime() - claimLeaseMs) {
    return { ok: false, error: "A emissão desta cobrança já está em andamento. Aguarde um minuto e tente novamente." };
  }
  await tx.financialEntry.update({
    where: { id: entry.id },
    // Register the provider before its callback can arrive. The webhook uses
    // this marker plus the arena-scoped external reference to find the entry.
    data: { onlineProvider: "MERCADO_PAGO", onlinePaymentClaimMethod: input.method, onlinePaymentClaimedAt: now },
  });
  return { ok: true, claimedAt: now };
}
