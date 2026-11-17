import type { Prisma } from "@prisma/client";

/** Mesma transação da confirmação. Conta nula apenas em cobranças legadas sinalizadas para conciliação. */
export async function recordTournamentRegistrationReceipt(tx: Prisma.TransactionClient, input: { arenaId: string; registrationId: string; bankAccountId: string | null; amountCents: number; leadName: string; partnerName: string; thirdName?: string; paidAt?: Date; paymentMethod?: string; leadPlayerId?: string | null }) {
  if (input.amountCents <= 0) return;
  const teamName = [input.leadName, input.partnerName, input.thirdName].filter(Boolean).join(" / ");
  const paidAt = input.paidAt ?? new Date();
  const paymentMethod = input.paymentMethod ?? "Recebimento manual";
  await tx.financialEntry.create({ data: {
    arenaId: input.arenaId, playerId: input.leadPlayerId, bankAccountId: input.bankAccountId, type: "REVENUE", category: "Inscrições de torneios",
    description: `Inscrição · ${teamName}`, counterpartyName: teamName,
    amountCents: input.amountCents, status: "PAID", paidAt, paymentMethod, source: "TOURNAMENT_REGISTRATION", externalReference: input.registrationId,
    settlements: { create: { arenaId: input.arenaId, bankAccountId: input.bankAccountId, amountCents: input.amountCents, paymentMethod, paidAt } },
  } });
}
