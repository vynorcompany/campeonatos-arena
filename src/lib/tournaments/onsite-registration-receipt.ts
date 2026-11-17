import type { Prisma } from "@prisma/client";
import { requireReceivingBankAccount } from "@/lib/finance/receiving-bank-account";
import { recordTournamentRegistrationReceipt } from "@/lib/tournaments/registration-receipt";

export async function receiveOnsiteTournamentRegistration(tx: Prisma.TransactionClient, input: { arenaId: string; registrationId: string; bankAccountId: string; paidAt: Date }) {
  await tx.$queryRaw`SELECT r.id FROM "PublicTournamentRegistration" r JOIN "Tournament" t ON t.id=r."tournamentId" WHERE r.id=${input.registrationId} AND t."arenaId"=${input.arenaId} FOR UPDATE OF r`;
  const registration = await tx.publicTournamentRegistration.findFirst({ where: { id: input.registrationId, tournament: { arenaId: input.arenaId } }, include: { tournament: { select: { publicSlug: true } } } });
  if (!registration || registration.paymentProvider !== "PAY_ON_SITE" || registration.status !== "CONFIRMED") throw new Error("Inscrição para pagamento no local não encontrada.");
  if (registration.paymentStatus === "PAID") return registration;
  if (registration.paymentStatus !== "PENDING" || registration.mercadoPagoPaymentId || registration.paymentCheckoutUrl || registration.paymentReference) throw new Error("Esta inscrição exige conferência antes de registrar o recebimento.");
  const bankAccountId = await requireReceivingBankAccount(tx, input.arenaId, input.bankAccountId);
  await recordTournamentRegistrationReceipt(tx, { arenaId: input.arenaId, registrationId: registration.id, leadPlayerId: registration.leadPlayerId, bankAccountId, amountCents: registration.amountCents, leadName: registration.leadName, partnerName: registration.partnerName, thirdName: registration.thirdName, paidAt: input.paidAt, paymentMethod: "Pagamento no local" });
  await tx.publicTournamentRegistration.update({ where: { id: registration.id }, data: { paymentStatus: "PAID", paymentBankAccountId: bankAccountId } });
  return registration;
}
