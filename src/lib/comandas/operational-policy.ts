import type { Prisma } from "@prisma/client";
import { arenaToday } from "@/lib/calendar/arena-wall-clock";
import { cashReferenceDate } from "@/lib/finance/cash-day";
import { getOutstandingCents } from "@/lib/finance/settlements";
import { ownedReceivables, retainedContactNeedsReview } from "@/lib/legal/retained-contact";

type Payment = { paymentMethod: string; amountCents: number; bankAccountId?: string };
export function applyComandaPaymentPolicy(input: { totalCents: number; creditCents: number; payments: readonly Payment[]; preventOverpayment: boolean; requireFullPayment: boolean; allowPartial: boolean; playerId: string | null; excessDisposition?: "CREDIT" | "CHANGE" }) {
  const paymentTotal = input.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  if (![input.totalCents, input.creditCents, paymentTotal].every(Number.isSafeInteger) || input.totalCents < 0 || input.creditCents < 0 || input.creditCents > input.totalCents || input.payments.some(payment => !Number.isSafeInteger(payment.amountCents) || payment.amountCents <= 0)) throw new Error("Valores de pagamento inválidos.");
  const excessCents = Math.max(0, paymentTotal + input.creditCents - input.totalCents);
  if (excessCents && input.preventOverpayment && !input.excessDisposition) throw new Error("Os pagamentos não podem ultrapassar o total a receber.");
  if (excessCents && input.excessDisposition !== "CHANGE" && !input.playerId) throw new Error("Vincule um cliente para registrar crédito de pagamento excedente.");
  const outstandingCents = Math.max(0, input.totalCents - paymentTotal - input.creditCents);
  if (outstandingCents && input.requireFullPayment && !input.allowPartial) throw new Error("Esta arena exige quitação integral. Autorize o saldo pendente para continuar.");
  let budget = input.totalCents - input.creditCents;
  const appliedPayments: Payment[] = []; const excessPayments: Payment[] = [];
  const normalized = input.payments.map(payment => ({...payment}));
  let changeCents = input.excessDisposition === "CHANGE" ? excessCents : 0;
  const cash = (value: string) => /^(dinheiro|cash)$/i.test(value.trim());
  if (changeCents > normalized.filter(p => cash(p.paymentMethod)).reduce((sum,p) => sum+p.amountCents,0)) throw new Error("O troco deve ser coberto pelo valor recebido em dinheiro. Ajuste os pagamentos ou escolha gerar saldo.");
  for (let i=normalized.length-1;i>=0 && changeCents;i--) if(cash(normalized[i].paymentMethod)) { const returned = Math.min(changeCents,normalized[i].amountCents); normalized[i].amountCents -= returned; changeCents -= returned; }
  for (const payment of normalized) {
    const applied = Math.min(budget, payment.amountCents); budget -= applied;
    if (applied) appliedPayments.push({ ...payment, amountCents: applied });
    if (payment.amountCents > applied) excessPayments.push({ ...payment, amountCents: payment.amountCents - applied });
  }
  return { appliedPayments, excessPayments, changeCents: input.excessDisposition === "CHANGE" ? excessCents : 0, excessCents: input.excessDisposition === "CHANGE" ? 0 : excessCents, outstandingCents, partialOverride: Boolean(outstandingCents && input.requireFullPayment && input.allowPartial) };
}

export async function assertComandaMayOpen(tx: Prisma.TransactionClient, arenaId: string, playerId: string, today = arenaToday()) {
  const settings = await tx.arenaOperationalSettings.findUnique({ where: { arenaId }, select: { blockDelinquentComandas: true, delinquentAfterDays: true } });
  const player = await tx.player.findFirst({ where: { id: playerId, arenaId }, select: { allowOverdueComandas: true } });
  if (!player) throw new Error("Cliente não encontrado.");
  const blockOverdue = player.allowOverdueComandas === null ? Boolean(settings?.blockDelinquentComandas) : !player.allowOverdueComandas;
  if (!blockOverdue && !settings?.blockDelinquentComandas) return;
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - (settings?.delinquentAfterDays ?? 1) + 1);
  const reviewReference = await retainedContactNeedsReview(tx, arenaId, playerId, cutoff);
  if (reviewReference) throw new Error(`Este cadastro precisa de revisão da recepção antes de abrir uma comanda. Protocolo: ${reviewReference}.`);
  if (!blockOverdue) return;
  const debts = await tx.financialEntry.findMany({ where: { arenaId, type: { in: ["REVENUE", "INCOME"] }, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] }, OR: [ownedReceivables(arenaId, [playerId]), { billingPlayerId: playerId }], dueDate: { lt: cutoff } }, select: { amountCents: true, settlements: { select: { amountCents: true, interestCents: true, discountCents: true } } } });
  if (debts.some(debt => getOutstandingCents(debt.amountCents, debt.settlements) > 0)) throw new Error("A abertura de comanda está bloqueada por pagamentos vencidos deste cliente.");
}

export async function assertComandaCashRegister(tx: Prisma.TransactionClient, arenaId: string, required: boolean, receivesPayment: boolean, now = new Date()) {
  if (!required || !receivesPayment) return;
  const date = cashReferenceDate(now);
  const registers = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "CashRegister" WHERE "arenaId" = ${arenaId} AND "referenceDate" = ${date} AND status = 'OPEN' ORDER BY "openedAt" DESC LIMIT 1 FOR UPDATE`;
  if (!registers.length) throw new Error("Abra o caixa do dia antes de receber o pagamento da comanda.");
}
