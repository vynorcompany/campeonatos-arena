"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { getFinancialEntryBalance } from "@/lib/finance/ledger";
import { createHostedCheckout } from "@/lib/payments/mercado-pago";
import { withArenaTransaction } from "@/lib/rls";
import { portalCheckoutPolicy } from "@/lib/payments/portal-checkout-policy";
import { env } from "@/lib/env";
import { expirePortalCheckoutsForArena } from "@/lib/payments/portal-checkout-expiry";

const paymentSchema = z.object({
  arenaSlug: z.string().trim().min(1).max(100),
});

export async function startPublicFinancialEntryPaymentAction(formData: FormData) {
  const parsed = paymentSchema.safeParse({ arenaSlug: formData.get("arenaSlug") });
  if (!parsed.success) throw new Error("Cobrança inválida.");
  const entryIds = [...new Set(formData.getAll("entryId").map((value) => String(value).trim()).filter(Boolean))];
  if (entryIds.some(id => id.length > 100)) throw new Error("Lançamento inválido.");
  if (entryIds.length > 50) throw new Error("Selecione até 50 lançamentos por pagamento.");
  if (!entryIds.length) throw new Error("Selecione ao menos um débito para pagar.");
  const auth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  const policy = portalCheckoutPolicy(await withArenaTransaction(auth.arenaId, tx => tx.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId } })));
  if (!policy.enabled) throw new Error(policy.bankAccountId ? "Esta arena desativou pagamentos pelo Portal. Procure a recepção." : "A arena precisa configurar a conta bancária dos pagamentos do Portal. Procure a recepção.");
  await expirePortalCheckoutsForArena(auth.arenaId, { playerId: auth.playerId, entryIds, limit: 3 });
  // A checkout without a stored link was never returned to the player. If its
  // creator disappeared, release only that unpublished attempt after 10 min.
  // Lock the checkout first, matching the webhook's lock order.
  const staleCutoff = new Date(Date.now() - 10 * 60_000);
  const unpublished = await withArenaTransaction(auth.arenaId, (tx) => tx.onlinePaymentCheckout.findMany({
    where: { arenaId: auth.arenaId, playerId: auth.playerId, status: "PENDING", checkoutUrl: "", mercadoPagoPaymentId: "", createdAt: { lt: staleCutoff }, items: { some: { financialEntryId: { in: entryIds } } } },
    select: { id: true },
  }));
  for (const pending of unpublished) {
    await withArenaTransaction(auth.arenaId, async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "OnlinePaymentCheckout" WHERE "id" = ${pending.id} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
      await tx.onlinePaymentCheckout.updateMany({
        where: { id: pending.id, arenaId: auth.arenaId, playerId: auth.playerId, status: "PENDING", checkoutUrl: "", mercadoPagoPaymentId: "", createdAt: { lt: staleCutoff } },
        data: { status: "FAILED" },
      });
    });
  }
  const checkoutPreparation = await withArenaTransaction(auth.arenaId, async (tx) => {
    // Concurrent checkout attempts for overlapping debts must agree on one
    // active payment link. Lock the entries in a stable order before reading.
    for (const entryId of [...entryIds].sort()) {
      await tx.$queryRaw`SELECT "id" FROM "FinancialEntry" WHERE "id" = ${entryId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    }
    if (policy.bankAccountId) {
      const bank = await tx.bankAccount.findFirst({ where: { id: policy.bankAccountId, arenaId: auth.arenaId, active: true }, select: { id: true } });
      if (!bank) throw new Error("A conta de recebimento foi alterada. Peça à arena para revisar os pagamentos do Portal.");
    }
    const [entries, player, reviewCheckout, pendingCheckouts] = await Promise.all([
      tx.financialEntry.findMany({
      where: { id: { in: entryIds }, arenaId: auth.arenaId, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] }, OR: [
        { playerId: auth.playerId, type: "REVENUE" },
        { type: { in: ["REVENUE", "INCOME"] }, sale: { comanda: { playerId: auth.playerId } } },
      ] },
      include: { settlements: { select: { amountCents: true, interestCents: true, discountCents: true, bankAccountId: true } } }
      }),
      tx.player.findFirst({ where: { id: auth.playerId, arenaId: auth.arenaId }, select: { email: true } }),
      tx.onlinePaymentCheckout.findFirst({ where: { arenaId: auth.arenaId, playerId: auth.playerId, status: "REVIEW", items: { some: { financialEntryId: { in: entryIds } } } }, select: { id: true } }),
      tx.onlinePaymentCheckout.findMany({ where: { arenaId: auth.arenaId, status: "PENDING", items: { some: { financialEntryId: { in: entryIds } } } }, select: { id: true, playerId: true, amountCents: true, checkoutUrl: true, expiresAt: true, items: { select: { financialEntryId: true, amountCents: true } } } }),
    ]);
    if (entries.length !== entryIds.length) throw new Error("Um ou mais lançamentos não estão disponíveis para pagamento.");
    if (reviewCheckout || entries.some((entry) => entry.notes.includes("[MP_REVIEW:"))) throw new Error("Existe um pagamento em análise para um dos lançamentos. Aguarde a conferência da arena antes de pagar novamente.");
    if (policy.bankAccountId && entries.some(entry => entry.settlements.some(settlement => !settlement.bankAccountId) && entry.bankAccountId !== policy.bankAccountId)) throw new Error("Um lançamento já possui recebimentos em outra conta. Solicite a conferência da arena antes de pagar pelo Portal.");
    if (!player?.email) throw new Error("Informe um e-mail no seu perfil antes de prosseguir com o pagamento.");
    const items = entries.map((entry) => ({ entry, amountCents: getFinancialEntryBalance(entry.amountCents, entry.settlements, entry.status).outstandingCents })).filter((item) => item.amountCents > 0);
    if (items.length !== entries.length) throw new Error("Um ou mais lançamentos já foram liquidados.");
    if (pendingCheckouts.length) {
      const pendingCheckout = pendingCheckouts[0];
      if (pendingCheckout.expiresAt && pendingCheckout.expiresAt <= new Date()) throw new Error("Este link de pagamento expirou e o cancelamento está sendo conferido. Aguarde e tente novamente. Se a mensagem persistir, procure a recepção.");
      const sameItems = pendingCheckout.items.length === items.length && pendingCheckout.items.every((item) => items.some((current) => current.entry.id === item.financialEntryId && current.amountCents === item.amountCents));
      const sameAmount = pendingCheckout.amountCents === items.reduce((total, item) => total + item.amountCents, 0);
      if (pendingCheckouts.length === 1 && pendingCheckout.playerId === auth.playerId && sameItems && sameAmount && pendingCheckout.checkoutUrl) return { kind: "reuse" as const, checkoutUrl: pendingCheckout.checkoutUrl };
      throw new Error("Já existe um pagamento em andamento para um dos débitos. Aguarde a conclusão antes de tentar novamente.");
    }
    const amountCents = items.reduce((total, item) => total + item.amountCents, 0);
    const validFrom = new Date();
    const expiresAt = policy.expiryMinutes ? new Date(validFrom.getTime() + policy.expiryMinutes * 60_000) : null;
    const checkout = await tx.onlinePaymentCheckout.create({ data: { bankAccountId: policy.bankAccountId, expiresAt, arenaId: auth.arenaId, playerId: auth.playerId, amountCents, items: { create: items.map((item) => ({ financialEntryId: item.entry.id, amountCents: item.amountCents })) } } });
    return { kind: "created" as const, checkout, amountCents, items, payerEmail: player.email, validFrom, expiresAt };
  });
  if (checkoutPreparation.kind === "reuse") return { checkoutUrl: checkoutPreparation.checkoutUrl };
  const { checkout, amountCents, items, payerEmail, validFrom, expiresAt } = checkoutPreparation;

  const returnUrl = `${env.appUrl ?? ""}/home?arena=${encodeURIComponent(parsed.data.arenaSlug)}&section=finance`;
  let charge;
  try {
    charge = await createHostedCheckout({ arenaId: auth.arenaId, amountCents, description: entryIds.length === 1 ? items[0].entry.description || "Pagamento da arena" : `${entryIds.length} débitos da arena`, payerEmail, externalReference: checkout.id, returnUrl, ...(expiresAt ? { validFrom, expiresAt } : {}), ...(policy.configured ? { paymentTypes: { pix: policy.pix, creditCard: policy.creditCard } } : {}) });
  } catch (error) {
    await withArenaTransaction(auth.arenaId, (tx) => tx.onlinePaymentCheckout.updateMany({ where: { id: checkout.id, arenaId: auth.arenaId, status: "PENDING" }, data: { status: "FAILED" } }));
    throw error;
  }
  if (!charge.checkoutUrl) {
    await withArenaTransaction(auth.arenaId, (tx) => tx.onlinePaymentCheckout.updateMany({ where: { id: checkout.id, arenaId: auth.arenaId, status: "PENDING" }, data: { status: "FAILED" } }));
    throw new Error("O Mercado Pago não retornou um link de pagamento.");
  }
  const updated = await withArenaTransaction(auth.arenaId, (tx) => tx.onlinePaymentCheckout.updateMany({ where: { id: checkout.id, arenaId: auth.arenaId, status: "PENDING" }, data: { mercadoPagoPreferenceId: charge.paymentId, mercadoPagoPaymentId: charge.paymentId, checkoutUrl: charge.checkoutUrl } }));
  if (!updated.count) throw new Error("O pagamento mudou de estado durante a criação do checkout. Atualize a página antes de tentar novamente.");
  revalidatePath(`/classificacao/${parsed.data.arenaSlug}`);
  revalidatePath("/home");
  return { checkoutUrl: charge.checkoutUrl };
}
