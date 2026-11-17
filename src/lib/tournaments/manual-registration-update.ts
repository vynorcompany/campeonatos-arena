import { validateRegistrationThird } from "@/lib/tournaments/trio-registration";
import { requireReceivingBankAccount } from "@/lib/finance/receiving-bank-account";
import { recordTournamentRegistrationReceipt } from "@/lib/tournaments/registration-receipt";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { ensureTournamentPairFromRegistration } from "@/lib/services/registration-pair";
import { canEditManualTournamentRegistration } from "@/lib/tournaments/registration-deletion";
import type { updateManualTournamentRegistrationSchema } from "@/lib/validators/public-registration";

type Input = Omit<z.infer<typeof updateManualTournamentRegistrationSchema>, "amountReais" | "registrationType"> & {
  registrationType?: "PAIR" | "INDIVIDUAL";
  arenaId: string;
  amountCents: number;
};

export async function updateManualTournamentRegistration(tx: Prisma.TransactionClient, input: Input): Promise<{ ok: true } | { ok: false; error: string }> {
  const registration = await tx.publicTournamentRegistration.findFirst({
    where: { id: input.registrationId, tournamentId: input.tournamentId, tournament: { arenaId: input.arenaId } },
    select: { id: true, status: true, paymentStatus: true, paymentProvider: true, paymentReference: true, mercadoPagoPaymentId: true, paymentCheckoutUrl: true, category: { select: { registrationType: true, competition: { select: { format: true } } } } },
  });
  if (!registration) return { ok: false, error: "Inscrição não encontrada nesta arena." };
  if (registration.status === "CANCELED" || ["REVIEW", "REFUNDED"].includes(registration.paymentStatus)) {
    return { ok: false, error: "Esta inscrição está cancelada ou tem pagamento em análise/estornado e não pode ser editada." };
  }
  if (!canEditManualTournamentRegistration(registration)) {
    return { ok: false, error: "Somente inscrições manuais pendentes podem ser editadas aqui. Inscrições confirmadas já podem estar vinculadas a duplas e jogos; cobranças online exigem conciliação própria." };
  }

  const category = await tx.tournamentCategory.findFirst({
    where: { id: input.categoryId, tournamentId: input.tournamentId, tournament: { arenaId: input.arenaId }, active: true },
    select: { id: true, registrationType: true, competition: { select: { id: true, format: true, status: true } } },
  });
  if (!category) return { ok: false, error: "Categoria inválida para este torneio." };

  if (category.registrationType !== (input.registrationType ?? "PAIR") || registration.category.registrationType !== category.registrationType) return { ok: false, error: "A categoria de destino deve manter o tipo de inscrição." };
  if ((registration.category?.competition?.format === "TRIO") !== (category.competition?.format === "TRIO")) return { ok: false, error: "A categoria de destino deve manter a modalidade da inscrição." };
  try { validateRegistrationThird(category.competition?.format, input); } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Equipe inválida." }; }
  if (category.competition?.format === "TRIO" && category.competition.status !== "DRAFT") return { ok: false, error: "As inscrições do Trio já foram encerradas." };
  let bankAccountId: string | null = null;
  if (input.paymentStatus === "PAID" && input.amountCents > 0) {
    try { bankAccountId = await requireReceivingBankAccount(tx, input.arenaId, input.bankAccountId); }
    catch (error) { if (error instanceof Error && error.message.startsWith("Selecione")) return { ok: false, error: error.message }; throw error; }
  }

  const updated = await tx.publicTournamentRegistration.updateMany({
    where: { id: registration.id, tournamentId: input.tournamentId, status: "PENDING_PAYMENT", paymentStatus: "PENDING", paymentProvider: "MANUAL", paymentReference: "", mercadoPagoPaymentId: "", paymentCheckoutUrl: "" },
    data: {
      categoryId: category.id,
      competitionId: category.competition?.format === "TRIO" ? category.competition.id : undefined,
      leadName: input.leadName,
      leadPhone: input.leadPhone,
      leadCpf: input.leadCpf,
      leadBirthDate: input.leadBirthDate,
      partnerName: input.partnerName,
      partnerPhone: input.partnerPhone,
      partnerCpf: input.partnerCpf,
      partnerBirthDate: input.partnerBirthDate,
      thirdName: input.thirdName, thirdPhone: input.thirdPhone, thirdCpf: input.thirdCpf, thirdBirthDate: input.thirdBirthDate,
      amountCents: input.amountCents,
      paymentStatus: input.paymentStatus,
      status: input.paymentStatus === "PAID" ? "CONFIRMED" : "PENDING_PAYMENT",
    },
  });
  if (updated.count !== 1) return { ok: false, error: "Esta inscrição foi alterada. Atualize a página." };

  if (bankAccountId) await recordTournamentRegistrationReceipt(tx, { ...input, bankAccountId });

  if (input.paymentStatus === "PAID") {
    await ensureTournamentPairFromRegistration(tx, {
      thirdCpf: input.thirdCpf,
      registrationId: registration.id,
      arenaId: input.arenaId,
      tournamentId: input.tournamentId,
      leadName: input.leadName,
      partnerName: input.partnerName,
      leadCpf: input.leadCpf,
      partnerCpf: input.partnerCpf,
    });
  }
  return { ok: true };
}
