import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { ensureTournamentPairFromRegistration } from "@/lib/services/registration-pair";
import { canEditManualTournamentRegistration } from "@/lib/tournaments/registration-deletion";
import type { updateManualTournamentRegistrationSchema } from "@/lib/validators/public-registration";

type Input = Omit<z.infer<typeof updateManualTournamentRegistrationSchema>, "amountReais"> & {
  arenaId: string;
  amountCents: number;
};

export async function updateManualTournamentRegistration(tx: Prisma.TransactionClient, input: Input): Promise<{ ok: true } | { ok: false; error: string }> {
  const registration = await tx.publicTournamentRegistration.findFirst({
    where: { id: input.registrationId, tournamentId: input.tournamentId, tournament: { arenaId: input.arenaId } },
    select: { id: true, status: true, paymentStatus: true, paymentProvider: true, paymentReference: true, mercadoPagoPaymentId: true, paymentCheckoutUrl: true },
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
    select: { id: true },
  });
  if (!category) return { ok: false, error: "Categoria inválida para este torneio." };

  const updated = await tx.publicTournamentRegistration.updateMany({
    where: { id: registration.id, tournamentId: input.tournamentId, status: "PENDING_PAYMENT", paymentStatus: "PENDING", paymentProvider: "MANUAL", paymentReference: "", mercadoPagoPaymentId: "", paymentCheckoutUrl: "" },
    data: {
      categoryId: category.id,
      leadName: input.leadName,
      leadPhone: input.leadPhone,
      leadCpf: input.leadCpf,
      leadBirthDate: input.leadBirthDate,
      partnerName: input.partnerName,
      partnerPhone: input.partnerPhone,
      partnerCpf: input.partnerCpf,
      partnerBirthDate: input.partnerBirthDate,
      amountCents: input.amountCents,
      paymentStatus: input.paymentStatus,
      status: input.paymentStatus === "PAID" ? "CONFIRMED" : "PENDING_PAYMENT",
    },
  });
  if (updated.count !== 1) return { ok: false, error: "Esta inscrição foi alterada. Atualize a página." };

  if (input.paymentStatus === "PAID") {
    await ensureTournamentPairFromRegistration(tx, {
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
