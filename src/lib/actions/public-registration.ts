"use server";
import { ensureTournamentRegistrationReceivable, cancelTournamentRegistrationReceivable } from "@/lib/tournaments/registration-receivable";
import { resolveIndividualRegistrationClient, registrationNameKey } from "@/lib/tournaments/individual-registration-client";
import { sameBrazilianPhone } from "@/lib/phone";
import { validateRegistrationThird } from "@/lib/tournaments/trio-registration";

import { requireReceivingBankAccount } from "@/lib/finance/receiving-bank-account";
import { revalidatePath } from "next/cache";
import { createCardCheckout, createHostedCheckout, createPixPayment } from "@/lib/payments/mercado-pago";
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
  redirectToCheckout?: boolean;
};

const initialState: PublicRegistrationState = {
  error: null,
  success: null
};

function normalizeCpf(input: string) {
  return input.replace(/\D/g, "");
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
  if (String(formData.get("contactWebsite") ?? "").trim()) return { ...initialState, error: "Não foi possível validar o formulário." };
  const parsed = createPublicRegistrationSchema.safeParse({
    tournamentSlug: formData.get("tournamentSlug"),
    categoryId: formData.get("categoryId"),
    registrationType: formData.get("registrationType") || "PAIR",
    paymentMethod: formData.get("paymentMethod") || "PIX",
    leadName: formData.get("leadName"),
    leadEmail: formData.get("leadEmail"),
    leadPhone: formData.get("leadPhone"),
    leadCpf: normalizeCpf(String(formData.get("leadCpf") ?? "")),
    leadBirthDate: null,
    partnerName: formData.get("partnerName"),
    partnerPhone: formData.get("partnerPhone"),
    partnerCpf: normalizeCpf(String(formData.get("partnerCpf") ?? "")),
    partnerBirthDate: null,
    thirdName: formData.get("thirdName"), thirdPhone: formData.get("thirdPhone"), thirdCpf: normalizeCpf(String(formData.get("thirdCpf") ?? "")), thirdBirthDate: null
  });

  if (!parsed.success) {
    return { ...initialState, error: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [target] = await tx.$queryRaw<{ id: string; arenaId: string }[]>`SELECT * FROM public.resolve_tournament_public_slug(${parsed.data.tournamentSlug})`;
      if (!target) throw new Error("Torneio nao encontrado.");
      await setArenaRlsContext(tx, target.arenaId);
      await lockTournamentRegistrations(tx, target.id, target.arenaId);
      const tournament = await tx.tournament.findUnique({
        where: { id: target.id },
        include: {
          categories: {
            where: { active: true, archivedAt: null },
            include: { competition: { select: { id: true, format: true, status: true } } },
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
      const isIndividual = selectedCategory.registrationType === "INDIVIDUAL";
      if ((selectedCategory.registrationType ?? "PAIR") !== (parsed.data.registrationType ?? "PAIR")) throw new Error("O tipo de inscrição não corresponde à categoria selecionada. Atualize a página.");
      const isTrio = selectedCategory.competition?.format === "TRIO";
      validateRegistrationThird(selectedCategory.competition?.format, parsed.data);
      if (isTrio && selectedCategory.competition?.status !== "DRAFT") throw new Error("As inscrições desta categoria de Trio já foram encerradas.");

      const leadClient = isIndividual ? await resolveIndividualRegistrationClient(tx, tournament.arenaId, parsed.data.leadName, parsed.data.leadPhone, parsed.data.leadCpf) : null;
      const leadCpf = leadClient?.cpf ?? parsed.data.leadCpf;

      await releaseExpiredPublicRegistrationHolds(tx, tournament.id, now);

      const occupiedSlots = await tx.publicTournamentRegistration.count({
        where: {
          tournamentId: tournament.id,
          categoryId: selectedCategory.id,
          status: { not: "CANCELED" }
        }
      });
      if (selectedCategory.maxRegistrations > 0 && occupiedSlots >= selectedCategory.maxRegistrations) {
        throw new Error("Esta categoria atingiu o limite máximo de inscrições.");
      }

      // Teams retain CPF identity for progressive category pricing. Individual
      // events use the arena client link, with contact matching for legacy rows.
      const cpfs = [leadCpf, ...(!isIndividual ? [parsed.data.partnerCpf] : []), ...(isTrio ? [parsed.data.thirdCpf] : [])].filter(Boolean);
      const candidates = await tx.publicTournamentRegistration.findMany({
        where: {
          tournamentId: tournament.id,
          ...(!isIndividual ? { OR: [{ leadCpf: { in: cpfs } }, { partnerCpf: { in: cpfs } }, { thirdCpf: { in: cpfs } }] } : {}),
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

      const registrations = isIndividual ? candidates.filter(item => item.leadPlayerId === leadClient!.id || Boolean(leadCpf && [item.leadCpf, item.partnerCpf, item.thirdCpf].includes(leadCpf)) || sameBrazilianPhone(item.leadPhone, parsed.data.leadPhone) && registrationNameKey(item.leadName) === registrationNameKey(parsed.data.leadName)) : candidates;

      if ((isTrio || isIndividual) && registrations.some(item => item.categoryId === selectedCategory.id)) throw new Error("Um dos atletas já está inscrito nesta categoria.");
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

      const leadCount = isIndividual ? registrations.length : registrations.filter(
        (item) => item.leadCpf === parsed.data.leadCpf || item.partnerCpf === parsed.data.leadCpf || item.thirdCpf === parsed.data.leadCpf
      ).length;
      const partnerCount = registrations.filter(
        (item) => item.leadCpf === parsed.data.partnerCpf || item.partnerCpf === parsed.data.partnerCpf || item.thirdCpf === parsed.data.partnerCpf
      ).length;

      const categoryPricing = {
        priceFirstCents: selectedCategory.priceFirstCents,
        priceSecondCents: selectedCategory.priceSecondCents,
        priceThirdCents: selectedCategory.priceThirdCents
      };

      const leadAmountCents = getPriceByOrder(leadCount + 1, categoryPricing);
      const partnerAmountCents = isIndividual ? 0 : getPriceByOrder(partnerCount + 1, categoryPricing);
      const thirdCount = isTrio ? registrations.filter(item => [item.leadCpf, item.partnerCpf, item.thirdCpf].includes(parsed.data.thirdCpf)).length : 0;
      const thirdAmountCents = isTrio ? getPriceByOrder(thirdCount + 1, categoryPricing) : 0;
      const grossAmountCents = leadAmountCents + partnerAmountCents + thirdAmountCents;
      const discountCents = tournament.earlyDiscountCents > 0 && (!tournament.earlyDiscountUntil || now <= tournament.earlyDiscountUntil)
        ? Math.min(grossAmountCents, tournament.earlyDiscountCents)
        : 0;
      const amountCents = grossAmountCents - discountCents;
      let paymentBankAccountId: string | null = null;
      if (amountCents > 0 && tournament.onlinePaymentEnabled !== false) {
        const settings = await tx.arenaOperationalSettings.findUnique({ where: { arenaId: tournament.arenaId }, select: { portalPaymentBankAccountId: true } });
        try {
          paymentBankAccountId = await requireReceivingBankAccount(tx, tournament.arenaId, settings?.portalPaymentBankAccountId);
        } catch {
          throw new Error("A arena precisa configurar uma conta bancária ativa para receber inscrições online. Procure a recepção.");
        }
      }
      const registration = await tx.publicTournamentRegistration.create({
        data: {
          tournamentId: tournament.id,
          categoryId: selectedCategory.id,
          leadPlayerId: leadClient?.id,
          leadName: parsed.data.leadName,
          leadPhone: parsed.data.leadPhone,
          leadCpf,
          leadBirthDate: parsed.data.leadBirthDate,
          partnerName: parsed.data.partnerName,
          partnerPhone: parsed.data.partnerPhone,
          partnerCpf: parsed.data.partnerCpf,
          partnerBirthDate: parsed.data.partnerBirthDate,
          thirdName: parsed.data.thirdName, thirdPhone: parsed.data.thirdPhone, thirdCpf: parsed.data.thirdCpf, thirdBirthDate: parsed.data.thirdBirthDate,
          competitionId: isTrio ? selectedCategory.competition!.id : undefined,
          registrationOrder,
          amountCents,
          paymentBankAccountId,
          discountCents,
          paymentStatus: "PENDING",
          paymentProvider: amountCents > 0 ? tournament.onlinePaymentEnabled === false ? "PAY_ON_SITE" : "MERCADO_PAGO_PENDING" : "",
          paymentReference: "",
          holdExpiresAt: amountCents > 0 && tournament.onlinePaymentEnabled !== false ? publicRegistrationPaymentExpiresAt(now) : null,
          status: amountCents > 0 && tournament.onlinePaymentEnabled === false ? "CONFIRMED" : "PENDING_PAYMENT"
        }
      });

      await ensureTournamentRegistrationReceivable(tx, tournament.arenaId, registration.id);
      if (amountCents > 0 && tournament.onlinePaymentEnabled === false) {
        await ensureTournamentPairFromRegistration(tx, { registrationId: registration.id, arenaId: tournament.arenaId, tournamentId: tournament.id, leadName: registration.leadName, partnerName: registration.partnerName, leadCpf: registration.leadCpf, partnerCpf: registration.partnerCpf, thirdCpf: registration.thirdCpf });
      }
      return { registration, amountCents, tournamentName: tournament.name, arenaId: tournament.arenaId, onlinePaymentEnabled: tournament.onlinePaymentEnabled !== false };
    });

    revalidatePath("/financeiro/contas-a-receber");
    revalidatePath("/torneios/inscricoes");
    if (!result.onlinePaymentEnabled && result.amountCents > 0) {
      revalidatePath(`/inscricao/${parsed.data.tournamentSlug}`);
      return { error: null, success: "Inscrição confirmada. Pagamento no local.", amountCents: result.amountCents, registrationId: result.registration.id };
    }

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
          thirdCpf: result.registration.thirdCpf,
          registrationId: result.registration.id,
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
      payment = !parsed.data.leadEmail
        ? await createHostedCheckout({ ...paymentPayload, paymentTypes: { pix: parsed.data.paymentMethod === "PIX", creditCard: parsed.data.paymentMethod === "CARD" } })
        : parsed.data.paymentMethod === "CARD"
        ? await createCardCheckout(paymentPayload)
        : await createPixPayment(paymentPayload);
      if (payment.provider !== "PIX_MOCK" && !payment.checkoutUrl && !payment.qrCode) throw new Error("O Mercado Pago não retornou um meio de pagamento para esta inscrição.");
    } catch (error) {
      // O provedor pode ter criado a cobrança antes de uma falha de rede.
      // Guarde a inscrição cancelada: um callback tardio ainda poderá ser
      // identificado pela referência e encaminhado para revisão/estorno.
      await withArenaTransaction(result.arenaId, async (tx) => {
        const canceled = await tx.publicTournamentRegistration.updateMany({
          where: { id: result.registration.id, tournamentId: result.registration.tournamentId, status: "PENDING_PAYMENT", paymentStatus: "PENDING", mercadoPagoPaymentId: "" },
          data: { status: "CANCELED", paymentProvider: "MERCADO_PAGO_FAILED" }
        });
        if (canceled.count) await cancelTournamentRegistrationReceivable(tx, result.arenaId, result.registration.id);
      });
      throw error;
    }

    const savedPayment = await withArenaTransaction(result.arenaId, (tx) => tx.publicTournamentRegistration.updateMany({
      where: { id: result.registration.id, tournamentId: result.registration.tournamentId, status: "PENDING_PAYMENT", paymentStatus: "PENDING" },
      data: {
        paymentProvider: payment.provider,
        paymentReference: payment.reference,
        // Checkout hospedado devolve o ID da preferência, não do pagamento.
        mercadoPagoPaymentId: parsed.data.paymentMethod === "CARD" || !parsed.data.leadEmail ? "" : payment.paymentId,
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
          thirdCpf: result.registration.thirdCpf,
          registrationId: result.registration.id,
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
      redirectToCheckout: !parsed.data.leadEmail,
      registrationId: result.registration.id
    };
  } catch (error) {
    return {
      ...initialState,
      error: error instanceof Error ? error.message : "Nao foi possivel concluir a inscricao."
    };
  }
}
