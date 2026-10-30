import type { Prisma } from "@prisma/client";

/** Mesma transação da confirmação. Conta nula apenas em cobranças legadas sinalizadas para conciliação. */
export async function recordTournamentRegistrationReceipt(tx: Prisma.TransactionClient, input: { arenaId: string; registrationId: string; bankAccountId: string | null; amountCents: number; leadName: string; partnerName: string; paidAt?: Date; paymentMethod?: string }) {
  if (input.amountCents <= 0) return;
  const paidAt = input.paidAt ?? new Date();
  const paymentMethod = input.paymentMethod ?? "Recebimento manual";
  await tx.financialEntry.create({ data: {
    arenaId: input.arenaId, bankAccountId: input.bankAccountId, type: "REVENUE", category: "Inscrições de torneios",
    description: `Inscrição · ${input.leadName} / ${input.partnerName}`, counterpartyName: `${input.leadName} / ${input.partnerName}`,
    amountCents: input.amountCents, status: "PAID", paidAt, paymentMethod, source: "TOURNAMENT_REGISTRATION", externalReference: input.registrationId,
    settlements: { create: { arenaId: input.arenaId, bankAccountId: input.bankAccountId, amountCents: input.amountCents, paymentMethod, paidAt } },
  } });
}
