import type { Prisma } from "@prisma/client";
import { getOutstandingCents } from "@/lib/finance/settlements";
import { ensureTournamentPairFromRegistration } from "@/lib/services/registration-pair";

export const REGISTRATION_REVENUE_SOURCE = "TOURNAMENT_REGISTRATION";

/** Serialize creation and receipt against the registration, before locking its ledger entry. */
export async function ensureTournamentRegistrationReceivable(tx: Prisma.TransactionClient, arenaId: string, registrationId: string) {
  await tx.$queryRaw`SELECT r.id FROM "PublicTournamentRegistration" r JOIN "Tournament" t ON t.id=r."tournamentId" WHERE r.id=${registrationId} AND t."arenaId"=${arenaId} FOR UPDATE OF r`;
  const registration = await tx.publicTournamentRegistration.findFirst({ where: { id: registrationId, tournament: { arenaId } }, include: { tournament: { select: { name: true } } } });
  if (!registration) throw new Error("Inscrição não encontrada nesta arena.");
  const entries = await tx.financialEntry.findMany({ where: { arenaId, source: REGISTRATION_REVENUE_SOURCE, externalReference: registrationId }, include: { settlements: true } });
  if (entries.length > 1) throw new Error("Esta inscrição possui lançamentos duplicados. Concilie o financeiro antes de receber.");
  const entry = entries[0];
  if (registration.amountCents <= 0 || registration.status === "CANCELED") {
    if (entry && entry.status !== "PAID" && !entry.settlements.length) await tx.financialEntry.update({ where: { id: entry.id }, data: { status: "VOIDED", voidedAt: new Date(), voidReason: "Inscrição cancelada ou sem cobrança." } });
    return null;
  }
  const teamName = [registration.leadName, registration.partnerName, registration.thirdName].filter(Boolean).join(" / ");
  const data = { playerId: registration.leadPlayerId, description: `Inscrição · ${registration.tournament.name} · ${teamName}`, counterpartyName: teamName, amountCents: registration.amountCents };
  if (entry) {
    if (entry.status === "VOIDED") throw new Error("O lançamento da inscrição foi estornado. Concilie o financeiro antes de receber.");
    if (entry.settlements.length || entry.status === "PAID") {
      if (entry.amountCents !== registration.amountCents) throw new Error("A inscrição possui recebimentos. Concilie antes de alterar o valor.");
      return entry;
    }
    return tx.financialEntry.update({ where: { id: entry.id }, data });
  }
  return tx.financialEntry.create({ data: { ...data, arenaId, bankAccountId: registration.paymentBankAccountId, type: "REVENUE", category: "Inscrições de torneios", status: "PENDING", dueDate: registration.createdAt, competenceDate: registration.createdAt, source: REGISTRATION_REVENUE_SOURCE, externalReference: registration.id } });
}

export async function cancelTournamentRegistrationReceivable(tx: Prisma.TransactionClient, arenaId: string, registrationId: string) {
  // A receipt must never disappear through a cancellation of an unpaid hold.
  await tx.financialEntry.updateMany({ where: { arenaId, source: REGISTRATION_REVENUE_SOURCE, externalReference: registrationId, status: { in: ["PENDING", "OVERDUE"] }, settlements: { none: {} } }, data: { status: "VOIDED", voidedAt: new Date(), voidReason: "Inscrição cancelada ou prazo de pagamento expirado." } });
}

/** Used before the ledger lock, including bulk receipt, to keep the same lock order as callbacks. */
export async function lockTournamentRegistrationEntriesForReceipt(tx: Prisma.TransactionClient, arenaId: string, entryIds: string[]) {
  const entries = await tx.financialEntry.findMany({ where: { arenaId, id: { in: entryIds }, source: REGISTRATION_REVENUE_SOURCE }, select: { externalReference: true } });
  for (const id of [...new Set(entries.map(entry => entry.externalReference))].sort()) {
    await tx.$queryRaw`SELECT r.id FROM "PublicTournamentRegistration" r JOIN "Tournament" t ON t.id=r."tournamentId" WHERE r.id=${id} AND t."arenaId"=${arenaId} FOR UPDATE OF r`;
    const registration = await tx.publicTournamentRegistration.findFirst({ where: { id, tournament: { arenaId } } });
    if (!registration || registration.status === "CANCELED" || !["PAY_ON_SITE", "MANUAL"].includes(registration.paymentProvider) || registration.paymentStatus !== "PENDING") throw new Error("Esta inscrição possui cobrança online, pagamento em análise ou já foi encerrada. Confira em Eventos antes de receber.");
  }
}

export async function syncTournamentRegistrationAfterReceipt(tx: Prisma.TransactionClient, arenaId: string, entryId: string) {
  const entry = await tx.financialEntry.findFirst({ where: { arenaId, id: entryId, source: REGISTRATION_REVENUE_SOURCE }, include: { settlements: true } });
  if (!entry || getOutstandingCents(entry.amountCents, entry.settlements) > 0) return;
  const registration = await tx.publicTournamentRegistration.findFirst({ where: { id: entry.externalReference, tournament: { arenaId }, paymentProvider: { in: ["PAY_ON_SITE", "MANUAL"] }, paymentStatus: "PENDING", status: { not: "CANCELED" } } });
  if (!registration) return;
  await tx.publicTournamentRegistration.update({ where: { id: registration.id }, data: { paymentStatus: "PAID", status: "CONFIRMED", paymentBankAccountId: entry.bankAccountId } });
  await ensureTournamentPairFromRegistration(tx, { arenaId, tournamentId: registration.tournamentId, registrationId: registration.id, leadName: registration.leadName, partnerName: registration.partnerName, leadCpf: registration.leadCpf, partnerCpf: registration.partnerCpf, thirdCpf: registration.thirdCpf });
}
