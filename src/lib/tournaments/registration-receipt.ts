import type { Prisma } from "@prisma/client";
import { ensureTournamentRegistrationReceivable } from "@/lib/tournaments/registration-receivable";
import { getOutstandingCents } from "@/lib/finance/settlements";

/** Receipt reuses the original debt, including legacy registrations without an entry. */
export async function recordTournamentRegistrationReceipt(tx: Prisma.TransactionClient, input: { arenaId: string; registrationId: string; bankAccountId: string | null; amountCents: number; leadName: string; partnerName: string; thirdName?: string; paidAt?: Date; paymentMethod?: string; leadPlayerId?: string | null }) {
  if (input.amountCents <= 0) return;
  const entry = await ensureTournamentRegistrationReceivable(tx, input.arenaId, input.registrationId);
  if (!entry) throw new Error("Esta inscrição não possui cobrança ativa.");
  await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id=${entry.id} AND "arenaId"=${input.arenaId} FOR UPDATE`;
  const current = await tx.financialEntry.findFirstOrThrow({ where: { id: entry.id, arenaId: input.arenaId }, include: { settlements: true } });
  if (current.status === "PAID") return;
  const amountCents = getOutstandingCents(current.amountCents, current.settlements);
  const paidAt = input.paidAt ?? new Date();
  const paymentMethod = input.paymentMethod ?? "Recebimento manual";
  if (amountCents > 0) await tx.financialSettlement.create({ data: { arenaId: input.arenaId, financialEntryId: current.id, bankAccountId: input.bankAccountId, amountCents, paymentMethod, paidAt } });
  await tx.financialEntry.update({ where: { id: current.id }, data: { status: "PAID", paidAt, paymentMethod, bankAccountId: input.bankAccountId } });
}
