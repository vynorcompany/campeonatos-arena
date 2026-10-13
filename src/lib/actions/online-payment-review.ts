"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { getMercadoPagoPayment } from "@/lib/payments/mercado-pago";
import { isProviderPaymentFullyReversed, markReviewedPaymentReversed } from "@/lib/payments/review-status";
import { withArenaTransaction } from "@/lib/rls";

export async function releaseReviewedCheckoutAction(checkoutIdInput: string, confirmed: boolean): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireModuleEdit("finance");
  const checkoutId = z.string().trim().min(1).safeParse(checkoutIdInput);
  if (!checkoutId.success || !confirmed) return { ok: false, error: "Confirme a conferência do estorno antes de liberar outra tentativa." };

  const checkout = await withArenaTransaction(auth.arenaId, (tx) => tx.onlinePaymentCheckout.findFirst({
    where: { id: checkoutId.data, arenaId: auth.arenaId, status: "REVIEW" },
    select: { id: true, mercadoPagoPaymentId: true },
  }));
  if (!checkout?.mercadoPagoPaymentId) return { ok: false, error: "Pagamento em análise não encontrado nesta arena." };

  let providerStatus: unknown;
  try {
    const payment = await getMercadoPagoPayment(auth.arenaId, checkout.mercadoPagoPaymentId);
    providerStatus = payment.status;
  } catch {
    return { ok: false, error: "Não foi possível conferir o pagamento no Mercado Pago. Tente novamente." };
  }
  if (!isProviderPaymentFullyReversed(providerStatus)) return { ok: false, error: "O Mercado Pago ainda não confirma estorno integral ou cancelamento. A cobrança permanece em análise." };

  const released = await withArenaTransaction(auth.arenaId, async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "OnlinePaymentCheckout" WHERE "id" = ${checkout.id} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    return tx.onlinePaymentCheckout.updateMany({
      where: { id: checkout.id, arenaId: auth.arenaId, status: "REVIEW", mercadoPagoPaymentId: checkout.mercadoPagoPaymentId },
      data: { status: "REFUNDED" },
    });
  });
  if (released.count !== 1) return { ok: false, error: "Este pagamento já foi alterado. Atualize a página." };
  revalidatePath("/relatorios/pagamentos-online");
  return { ok: true };
}

export async function releaseReviewedFinancialEntryAction(entryIdInput: string, paymentIdInput: string, confirmed: boolean): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireModuleEdit("finance");
  const entryId = z.string().trim().min(1).safeParse(entryIdInput);
  const paymentId = z.string().trim().min(1).max(120).safeParse(paymentIdInput);
  if (!entryId.success || !paymentId.success || !confirmed) return { ok: false, error: "Confirme o estorno e selecione um pagamento válido." };

  const entry = await withArenaTransaction(auth.arenaId, (tx) => tx.financialEntry.findFirst({
    where: { id: entryId.data, arenaId: auth.arenaId, status: { in: ["PENDING", "OVERDUE"] }, notes: { contains: `[MP_REVIEW:${paymentId.data}]` } },
    select: { id: true, notes: true },
  }));
  if (!entry) return { ok: false, error: "Lançamento em análise não encontrado nesta arena." };

  let providerStatus: unknown;
  try {
    const payment = await getMercadoPagoPayment(auth.arenaId, paymentId.data);
    providerStatus = payment.status;
  } catch {
    return { ok: false, error: "Não foi possível conferir o pagamento no Mercado Pago. Tente novamente." };
  }
  if (!isProviderPaymentFullyReversed(providerStatus)) return { ok: false, error: "O Mercado Pago ainda não confirma estorno integral ou cancelamento. O lançamento permanece em análise." };

  const released = await withArenaTransaction(auth.arenaId, async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "FinancialEntry" WHERE "id" = ${entry.id} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const current = await tx.financialEntry.findFirst({ where: { id: entry.id, arenaId: auth.arenaId, status: { in: ["PENDING", "OVERDUE"] } }, select: { notes: true } });
    const notes = current && markReviewedPaymentReversed(current.notes, paymentId.data);
    if (notes === null || !current) return { count: 0 };
    return tx.financialEntry.updateMany({ where: { id: entry.id, arenaId: auth.arenaId, status: { in: ["PENDING", "OVERDUE"] }, notes: current.notes }, data: { notes } });
  });
  if (released.count !== 1) return { ok: false, error: "Este lançamento já foi alterado. Atualize a página." };
  revalidatePath("/relatorios/pagamentos-online");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/home");
  return { ok: true };
}

export async function cancelReviewedRegistrationAction(registrationIdInput: string, confirmed: boolean): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireModuleEdit("tournaments");
  const registrationId = z.string().trim().min(1).safeParse(registrationIdInput);
  if (!registrationId.success || !confirmed) return { ok: false, error: "Confirme o estorno antes de cancelar a inscrição em análise." };

  const registration = await withArenaTransaction(auth.arenaId, (tx) => tx.publicTournamentRegistration.findFirst({
    where: { id: registrationId.data, tournament: { arenaId: auth.arenaId }, status: { in: ["PENDING_PAYMENT", "CANCELED"] }, paymentStatus: "REVIEW" },
    select: { id: true, tournamentId: true, mercadoPagoPaymentId: true },
  }));
  if (!registration?.mercadoPagoPaymentId) return { ok: false, error: "Inscrição em análise não encontrada nesta arena." };

  let providerStatus: unknown;
  try {
    const payment = await getMercadoPagoPayment(auth.arenaId, registration.mercadoPagoPaymentId);
    providerStatus = payment.status;
  } catch {
    return { ok: false, error: "Não foi possível conferir o pagamento no Mercado Pago. Tente novamente." };
  }
  if (!isProviderPaymentFullyReversed(providerStatus)) return { ok: false, error: "O Mercado Pago ainda não confirma estorno integral ou cancelamento. A inscrição permanece em análise." };

  const released = await withArenaTransaction(auth.arenaId, async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "PublicTournamentRegistration" WHERE "id" = ${registration.id} AND "tournamentId" = ${registration.tournamentId} FOR UPDATE`;
    return tx.publicTournamentRegistration.updateMany({
      where: { id: registration.id, tournamentId: registration.tournamentId, status: { in: ["PENDING_PAYMENT", "CANCELED"] }, paymentStatus: "REVIEW", mercadoPagoPaymentId: registration.mercadoPagoPaymentId },
      data: { status: "CANCELED", paymentStatus: "REFUNDED", paymentCheckoutUrl: "", paymentQrCode: "", paymentQrCodeBase64: "" },
    });
  });
  if (released.count !== 1) return { ok: false, error: "Esta inscrição já foi alterada. Atualize a página." };
  revalidatePath("/relatorios/pagamentos-online");
  revalidatePath(`/torneios/${registration.tournamentId}`);
  revalidatePath(`/torneios/${registration.tournamentId}/inscricoes`);
  return { ok: true };
}
