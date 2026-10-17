"use server";

import { revalidatePath } from "next/cache";
import { createCardCheckout, createPixPayment } from "@/lib/payments/mercado-pago";
import { prisma } from "@/lib/prisma";
import { ensureTournamentPairFromRegistration } from "@/lib/services/registration-pair";
import { createPublicRegistrationSchema } from "@/lib/validators/public-registration";
import { env } from "@/lib/env";
import { lockTournamentRegistrations, nextTournamentRegistrationOrder } from "@/lib/tournaments/registration-order";
import { publicRegistrationPaymentExpiresAt, publicRegistrationPixExpiresAt, releaseExpiredPublicRegistrationHolds } from "@/lib/tournaments/registration-payment-hold";
import { setArenaRlsContext, withArenaTransaction } from "@/lib/rls";

type PublicRegistrationState = {
  error: string | null;
  success: string | null;
  paymentReference?: string;
  amountCents?: number;
  paymentQrCode?: string;
  paymentQrCodeBase64?: string;
  paymentCheckoutUrl?: string;
  paymentMethod?: "PIX" | "CARD";
  registrationId?: string;
};

const initialState: PublicRegistrationState = {
  error: null,
  success: null
};

function normalizeCpf(input: string) {
  return input.replace(/\D/g, "");
}

function normalizeDateInput(input: unknown) {
  const value = String(input ?? "").trim();
  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month}-${day}`;
  }
  return value;
}

function getPriceByOrder(
  order: number,
  pricing: { priceFirstCents: number; priceSecondCents: number; priceThirdCents: number }
) {
  if (order <= 1) return pricing.priceFirstCents;
  if (order === 2) return pricing.priceSecondCents;
  return pricing.priceThirdCents;
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
    leadBirthDate: normalizeDateInput(formData.get("leadBirthDate")),
    partnerName: formData.get("partnerName"),
    partnerPhone: formData.get("partnerPhone"),
    partnerCpf: normalizeCpf(String(formData.get("partnerCpf") ?? "")),
    partnerBirthDate: normalizeDateInput(formData.get("partnerBirthDate"))
  });

  if (!parsed.success) {
    return { ...initialState, error: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.tournament.findUnique({
        where: { publicSlug: parsed.data.tournamentSlug },
        select: { id: true, arenaId: true }
      });
      if (!target) throw new Error("Torneio nao encontrado.");
      await setArenaRlsContext(tx, target.arenaId);
      await lockTournamentRegistrations(tx, target.id, target.arenaId);
      const tournament = await tx.tournament.findUnique({
        where: { id: target.id },
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
      const now = new Date();
      if (tournament.registrationOpensAt && now < tournament.registrationOpensAt) throw new Error("As inscrições ainda não foram abertas.");
      if (tournament.registrationClosesAt && now > tournament.registrationClosesAt) throw new Error("As inscrições deste torneio foram encerradas.");

      const selectedCategory = tournament.categories.find((category) => category.id === parsed.data.categoryId);
      if (!selectedCategory) throw new Error("Categoria invalida.");

      await releaseExpiredPublicRegistrationHolds(tx, tournament.id, now);

      const occupiedSlots = await tx.publicTournamentRegistration.count({
        where: {
          tournamentId: tournament.id,
          categoryId: selectedCategory.id,
          status: { not: "CANCELED" }
        }
      });
      if (selectedCategory.maxRegistrations > 0 && occupiedSlots >= selectedCategory.maxRegistrations) {
        throw new Error("Esta categoria atingiu o limite máximo de duplas inscritas.");
      }

      // CPF is the athlete identity in public registration. Counts below are
      // intentionally calculated per CPF, so the second and third prices
      // follow the athlete even when they enter with a different partner.
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

      const registrationOrder = await nextTournamentRegistrationOrder(tx, tournament.id);

      if (selectedCategory.allowedRegistrationCategoryIds.length) {
        const incompatible = registrations.find((item) => !selectedCategory.allowedRegistrationCategoryIds.includes(item.categoryId));
        if (incompatible) throw new Error("Esta categoria só permite inscrição conjunta com as categorias vinculadas na configuração do torneio.");
      }

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

      const categoryPricing = {
        priceFirstCents: selectedCategory.priceFirstCents,
        priceSecondCents: selectedCategory.priceSecondCents,
        priceThirdCents: selectedCategory.priceThirdCents
      };

      const leadAmountCents = getPriceByOrder(leadCount + 1, categoryPricing);
      const partnerAmountCents = getPriceByOrder(partnerCount + 1, categoryPricing);
      const grossAmountCents = leadAmountCents + partnerAmountCents;
      const discountCents = tournament.earlyDiscountCents > 0 && (!tournament.earlyDiscountUntil || now <= tournament.earlyDiscountUntil)
        ? Math.min(grossAmountCents, tournament.earlyDiscountCents)
        : 0;
      const amountCents = grossAmountCents - discountCents;
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
          discountCents,
          paymentStatus: "PENDING",
          paymentProvider: amountCents > 0 ? "MERCADO_PAGO_PENDING" : "",
          paymentReference: "",
          holdExpiresAt: amountCents > 0 ? publicRegistrationPaymentExpiresAt(now) : null,
          status: "PENDING_PAYMENT"
        }
      });

      return { registration, amountCents, tournamentName: tournament.name, arenaId: tournament.arenaId };
    });

    const paymentPayload = {
      arenaId: result.arenaId,
      amountCents: result.amountCents,
      description: `Inscrição ${result.tournamentName}`,
      payerEmail: parsed.data.leadEmail,
      externalReference: result.registration.id,
      returnUrl: `${env.appUrl ?? ""}/inscricao/${parsed.data.tournamentSlug}/sucesso/${result.registration.id}`,
      expiresAt: parsed.data.paymentMethod === "PIX"
        ? publicRegistrationPixExpiresAt(result.registration.createdAt)
        : result.registration.holdExpiresAt ?? undefined,
      validFrom: result.registration.createdAt,
    };

    if (result.amountCents === 0) {
      await withArenaTransaction(result.arenaId, async (tx) => {
        await tx.publicTournamentRegistration.update({
          where: { id: result.registration.id },
          data: { paymentStatus: "PAID", paymentProvider: "FREE", paymentReference: "FREE", status: "CONFIRMED" }
        });
        await ensureTournamentPairFromRegistration(tx, {
          arenaId: result.arenaId,
          tournamentId: result.registration.tournamentId,
          leadName: result.registration.leadName,
          partnerName: result.registration.partnerName,
          leadCpf: result.registration.leadCpf,
          partnerCpf: result.registration.partnerCpf
        });
      });
      revalidatePath(`/inscricao/${parsed.data.tournamentSlug}`);
      return { error: null, success: "Inscrição gratuita confirmada com sucesso.", paymentReference: "FREE", amountCents: 0, registrationId: result.registration.id };
    }

    let payment;
    try {
      payment = parsed.data.paymentMethod === "CARD"
        ? await createCardCheckout(paymentPayload)
        : await createPixPayment(paymentPayload);
      if (payment.provider !== "PIX_MOCK" && !payment.checkoutUrl && !payment.qrCode) throw new Error("O Mercado Pago não retornou um meio de pagamento para esta inscrição.");
    } catch (error) {
      // O provedor pode ter criado a cobrança antes de uma falha de rede.
      // Guarde a inscrição cancelada: um callback tardio ainda poderá ser
      // identificado pela referência e encaminhado para revisão/estorno.
      await withArenaTransaction(result.arenaId, (tx) => tx.publicTournamentRegistration.updateMany({
        where: { id: result.registration.id, tournamentId: result.registration.tournamentId, status: "PENDING_PAYMENT", paymentStatus: "PENDING", mercadoPagoPaymentId: "" },
        data: { status: "CANCELED", paymentProvider: "MERCADO_PAGO_FAILED" }
      }));
      throw error;
    }

    const savedPayment = await withArenaTransaction(result.arenaId, (tx) => tx.publicTournamentRegistration.updateMany({
      where: { id: result.registration.id, tournamentId: result.registration.tournamentId, status: "PENDING_PAYMENT", paymentStatus: "PENDING" },
      data: {
        paymentProvider: payment.provider,
        paymentReference: payment.reference,
        // Checkout de cartão devolve o ID da preferência, não do pagamento.
        mercadoPagoPaymentId: parsed.data.paymentMethod === "CARD" ? "" : payment.paymentId,
        paymentQrCode: payment.qrCode,
        paymentQrCodeBase64: payment.qrCodeBase64,
        paymentCheckoutUrl: payment.checkoutUrl,
        paymentExpiresAt: payment.expiresAt
      }
    }));
    if (savedPayment.count !== 1) {
      revalidatePath(`/inscricao/${parsed.data.tournamentSlug}`);
      return { error: null, success: "O pagamento desta inscrição já foi atualizado. Confira a situação antes de tentar novamente.", amountCents: result.amountCents, registrationId: result.registration.id };
    }

    if (payment.provider === "PIX_MOCK") {
      await withArenaTransaction(result.arenaId, async (tx) => {
        await tx.publicTournamentRegistration.update({
          where: { id: result.registration.id },
          data: {
            paymentStatus: "PAID",
            status: "CONFIRMED"
          }
        });

        await ensureTournamentPairFromRegistration(tx, {
          arenaId: result.arenaId,
          tournamentId: result.registration.tournamentId,
          leadName: result.registration.leadName,
          partnerName: result.registration.partnerName,
          leadCpf: result.registration.leadCpf,
          partnerCpf: result.registration.partnerCpf
        });
      });
    }

    revalidatePath(`/inscricao/${parsed.data.tournamentSlug}`);
    return {
      error: null,
      success:
        payment.provider === "PIX_MOCK"
          ? "Inscricao criada e confirmada com sucesso (modo teste sem pagamento)."
          : "Inscricao criada. Conclua o pagamento para confirmar a vaga no torneio.",
      paymentReference: payment.reference,
      amountCents: result.amountCents,
      paymentQrCode: payment.qrCode,
      paymentQrCodeBase64: payment.qrCodeBase64,
      paymentCheckoutUrl: payment.checkoutUrl,
      paymentMethod: parsed.data.paymentMethod,
      registrationId: result.registration.id
    };
  } catch (error) {
    return {
      ...initialState,
      error: error instanceof Error ? error.message : "Nao foi possivel concluir a inscricao."
    };
  }
}
