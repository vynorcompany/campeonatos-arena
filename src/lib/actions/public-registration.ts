"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createCardCheckout, createPixPayment } from "@/lib/payments/mercado-pago";
import { createPublicRegistrationSchema } from "@/lib/validators/public-registration";

type PublicRegistrationState = {
  error: string | null;
  success: string | null;
  paymentReference?: string;
  amountCents?: number;
  paymentQrCode?: string;
  paymentQrCodeBase64?: string;
  paymentCheckoutUrl?: string;
  paymentMethod?: "PIX" | "CARD";
};

const initialState: PublicRegistrationState = {
  error: null,
  success: null
};

function normalizeCpf(input: string) {
  return input.replace(/\D/g, "");
}

function getPriceByOrder(order: number, tournament: { priceFirstCents: number; priceSecondCents: number; priceThirdCents: number }) {
  if (order <= 1) return tournament.priceFirstCents;
  if (order === 2) return tournament.priceSecondCents;
  return tournament.priceThirdCents;
}

function getIncrementalPriceByOrder(
  order: number,
  tournament: { priceFirstCents: number; priceSecondCents: number; priceThirdCents: number }
) {
  if (order <= 1) {
    return tournament.priceFirstCents;
  }
  if (order === 2) {
    return Math.max(tournament.priceSecondCents - tournament.priceFirstCents, 0);
  }
  return Math.max(tournament.priceThirdCents - tournament.priceSecondCents, 0);
}

export async function createPublicRegistrationAction(
  _: PublicRegistrationState,
  formData: FormData
): Promise<PublicRegistrationState> {
  const parsed = createPublicRegistrationSchema.safeParse({
    tournamentSlug: formData.get("tournamentSlug"),
    categoryId: formData.get("categoryId"),
    paymentMethod: formData.get("paymentMethod"),
    leadName: formData.get("leadName"),
    leadEmail: formData.get("leadEmail"),
    leadPhone: formData.get("leadPhone"),
    leadCpf: normalizeCpf(String(formData.get("leadCpf") ?? "")),
    leadBirthDate: formData.get("leadBirthDate"),
    partnerName: formData.get("partnerName"),
    partnerPhone: formData.get("partnerPhone"),
    partnerCpf: normalizeCpf(String(formData.get("partnerCpf") ?? "")),
    partnerBirthDate: formData.get("partnerBirthDate")
  });

  if (!parsed.success) {
    return { ...initialState, error: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { publicSlug: parsed.data.tournamentSlug },
        include: {
          categories: {
            where: { active: true },
            orderBy: { level: "asc" }
          }
        }
      });

      if (!tournament) throw new Error("Torneio nao encontrado.");
      if (tournament.registrationPhase !== "REGISTRATIONS") {
        throw new Error("As inscricoes deste torneio estao encerradas.");
      }

      const selectedCategory = tournament.categories.find((category) => category.id === parsed.data.categoryId);
      if (!selectedCategory) throw new Error("Categoria invalida.");

      const cpfs = [parsed.data.leadCpf, parsed.data.partnerCpf];
      const registrations = await tx.publicTournamentRegistration.findMany({
        where: {
          tournamentId: tournament.id,
          OR: [{ leadCpf: { in: cpfs } }, { partnerCpf: { in: cpfs } }],
          status: {
            not: "CANCELED"
          }
        },
        include: {
          category: {
            select: { level: true }
          }
        }
      });

      const registrationOrder = registrations.length + 1;

      if (tournament.blockCategoryGap) {
        for (const existing of registrations) {
          if (Math.abs(existing.category.level - selectedCategory.level) > tournament.maxCategoryGap) {
            throw new Error("A categoria escolhida viola o bloqueio de diferenca de nivel permitido.");
          }
        }
      }

      const leadCount = registrations.filter(
        (item) => item.leadCpf === parsed.data.leadCpf || item.partnerCpf === parsed.data.leadCpf
      ).length;
      const partnerCount = registrations.filter(
        (item) => item.leadCpf === parsed.data.partnerCpf || item.partnerCpf === parsed.data.partnerCpf
      ).length;

      const leadAmountCents = getIncrementalPriceByOrder(leadCount + 1, tournament);
      const partnerAmountCents = getIncrementalPriceByOrder(partnerCount + 1, tournament);
      const amountCents = leadAmountCents + partnerAmountCents;
      const registration = await tx.publicTournamentRegistration.create({
        data: {
          tournamentId: tournament.id,
          categoryId: selectedCategory.id,
          leadName: parsed.data.leadName,
          leadPhone: parsed.data.leadPhone,
          leadCpf: parsed.data.leadCpf,
          leadBirthDate: parsed.data.leadBirthDate,
          partnerName: parsed.data.partnerName,
          partnerPhone: parsed.data.partnerPhone,
          partnerCpf: parsed.data.partnerCpf,
          partnerBirthDate: parsed.data.partnerBirthDate,
          registrationOrder,
          amountCents,
          paymentStatus: "PENDING",
          paymentProvider: "",
          paymentReference: "",
          status: "PENDING_PAYMENT"
        }
      });

      return { registration, amountCents, tournamentName: tournament.name };
    });

    const payment =
      parsed.data.paymentMethod === "CARD"
        ? await createCardCheckout({
            amountCents: result.amountCents,
            description: `Inscricao ${result.tournamentName}`,
            payerEmail: parsed.data.leadEmail,
            externalReference: result.registration.id
          })
        : await createPixPayment({
            amountCents: result.amountCents,
            description: `Inscricao ${result.tournamentName}`,
            payerEmail: parsed.data.leadEmail,
            externalReference: result.registration.id
          });

    await prisma.publicTournamentRegistration.update({
      where: { id: result.registration.id },
      data: {
        paymentProvider: parsed.data.paymentMethod === "CARD" ? "MERCADO_PAGO_CARD" : payment.provider,
        paymentReference: payment.reference,
        mercadoPagoPaymentId: payment.paymentId,
        paymentQrCode: payment.qrCode,
        paymentQrCodeBase64: payment.qrCodeBase64,
        paymentCheckoutUrl: payment.checkoutUrl,
        paymentExpiresAt: payment.expiresAt
      }
    });

    revalidatePath(`/inscricao/${parsed.data.tournamentSlug}`);
    return {
      error: null,
      success: "Inscricao criada. Finalize o pagamento para confirmar a vaga.",
      paymentReference: payment.reference,
      amountCents: result.amountCents,
      paymentQrCode: payment.qrCode,
      paymentQrCodeBase64: payment.qrCodeBase64,
      paymentCheckoutUrl: payment.checkoutUrl,
      paymentMethod: parsed.data.paymentMethod
    };
  } catch (error) {
    return {
      ...initialState,
      error: error instanceof Error ? error.message : "Nao foi possivel concluir a inscricao."
    };
  }
}
