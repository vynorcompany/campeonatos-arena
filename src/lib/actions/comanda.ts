"use server";
import { ingredientChoicesSchema } from "@/lib/products/composition";
import { consumeProductStock, assertAggregateAvailability } from "@/lib/products/stock-aggregates";
import { requireReceivingBankAccount } from "@/lib/finance/receiving-bank-account";
import { appendComandaProduct, confirmPortalOrderItem, submitPortalOrder } from "@/lib/comandas/portal-orders";
import { after } from "next/server";
import { enqueueComandaWhatsapp } from "@/lib/comandas/whatsapp-outbox";
import { dispatchComandaWhatsapp } from "@/lib/comandas/whatsapp-delivery";
import { applyComandaPaymentPolicy, assertComandaMayOpen, assertComandaCashRegister } from "@/lib/comandas/operational-policy";
import { allocateComandaShares } from "@/lib/comandas/split";
import { deleteComandaWithAudit } from "@/lib/comandas/delete-with-audit";
import { arenaDatabase } from "@/lib/arena-database";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission, requireRole } from "@/lib/auth/guards";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { allocatePaymentsToDebts, getOutstandingCents } from "@/lib/finance/settlements";
import { comandaDebtOwnerId, selectedComandaDebtWhere } from "@/lib/finance/comanda-debts";
import { cashReferenceDate } from "@/lib/finance/cash-day";
import { recordCashSaleIfOpen } from "@/lib/finance/cash-register-sales";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { issueManualFiscalDocument, type FiscalDocumentType } from "@/lib/fiscal/manual-issuance";

const comandaSchema = z.object({
  type: z.enum(["CLIENT", "AVULSA"]),
  cardNumber: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/).optional(),
  playerId: z.string().trim().optional(),
  label: z.string().trim().max(80).optional()
});

function parseIngredientChoices(formData: FormData) { try { return ingredientChoicesSchema.parse(JSON.parse(String(formData.get("choices") ?? "{}"))); } catch { throw new Error("Revise as opções do produto."); } }

const comandaProductSchema = z.object({
  comandaId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(999).default(1)
});

const itemQuantitySchema = z.object({
  itemId: z.string().min(1),
  delta: z.coerce.number().int().refine((value) => value === 1 || value === -1, "Ajuste inválido.")
});

const paymentsSchema = z.array(z.object({
  bankAccountId: z.string().trim().optional().default(""),
  paymentMethod: z.string().trim().min(1).max(80),
  amountCents: z.coerce.number().int().positive()
})).max(8);

const finishComandaSchema = z.object({
  comandaId: z.string().min(1),
  shares: z.array(z.object({ playerId: z.string().min(1).nullable(), amountCents: z.coerce.number().int().nonnegative() })).max(20).default([]),
  payments: paymentsSchema,
  debtIds: z.array(z.string().min(1)).max(30),
  creditCents: z.coerce.number().int().nonnegative(),
  allowEmpty: z.preprocess(value => value === true || value === "true" || value === "on", z.boolean()).default(false),
  allowPartial: z.preprocess(value => value === true || value === "true" || value === "on", z.boolean()).default(false),
  fiscalDocumentType: z.enum(["", "NFS_E", "NFC_E"]).default("")
});

function formatComandaCode() {
  return `CMD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createComandaAction(formData: FormData) {
  const auth = await requirePermission("pos:command:create");
  const prisma = arenaDatabase(auth.arenaId);
  const parsed = comandaSchema.safeParse({
    type: formData.get("type"),
    cardNumber: formData.get("cardNumber") || undefined,
    playerId: formData.get("playerId") || undefined,
    label: formData.get("label") || undefined
  });

  if (!parsed.success) {
    throw new Error("Dados da comanda inválidos.");
  }

  let player: { id: string; name: string } | null = null;
  if (parsed.data.type === "CLIENT") {
    if (!parsed.data.playerId) {
      throw new Error("Selecione o cliente da comanda.");
    }

    player = await prisma.player.findFirst({
      where: { id: parsed.data.playerId, arenaId: auth.arenaId, active: true },
      select: { id: true, name: true }
    });

    if (!player) {
      throw new Error("Cliente não encontrado.");
    }
  }

  const label = parsed.data.type === "CLIENT" ? player!.name : parsed.data.label;
  if (!label) {
    throw new Error("Informe um nome para a comanda avulsa.");
  }

  const result = await withArenaTransaction(auth.arenaId, async (tx) => {
    const operational = await tx.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId }, select: { comandaCardsEnabled: true } });
    const cardNumber = parsed.data.cardNumber?.toUpperCase();
    if (cardNumber && !operational?.comandaCardsEnabled) throw new Error("Cartões de comanda não estão habilitados nesta arena.");
    if (cardNumber) {
      await tx.$queryRaw`SELECT id FROM "ArenaOperationalSettings" WHERE "arenaId" = ${auth.arenaId} FOR UPDATE`;
      const used = await tx.comanda.findFirst({ where: { arenaId: auth.arenaId, status: "OPEN", cardNumber }, select: { playerId: true } });
      if (used && (!player || used.playerId !== player.id)) throw new Error("Este cartão já está em uso em outra comanda aberta.");
    }
    if (player) {
      await tx.$queryRaw`SELECT id FROM "Player" WHERE id = ${player.id} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
      const existing = await tx.comanda.findFirst({
        where: { arenaId: auth.arenaId, playerId: player.id, status: "OPEN" },
        select: { id: true, openedAt: true, cardNumber: true }
      });
      if (existing) {
        await tx.arenaNotification.updateMany({ where: { arenaId: auth.arenaId, type: "COMANDA_OPEN_REQUEST", readAt: null, href: `/comandas?new=client&player=${encodeURIComponent(player.id)}` }, data: { readAt: new Date() } });
        if (cardNumber && existing.cardNumber && existing.cardNumber !== cardNumber) throw new Error("O cliente já tem uma comanda aberta com outro cartão.");
        if (cardNumber && !existing.cardNumber) await tx.comanda.update({ where: { id: existing.id }, data: { cardNumber } });
        return { comandaId: existing.id, openedAt: existing.openedAt.toISOString(), reused: true, message: "Já existe uma comanda aberta para este cliente." };
      }
      await assertComandaMayOpen(tx, auth.arenaId, player.id);
    }
    const productCount = await tx.product.count({ where: { arenaId: auth.arenaId, active: true } });
    if (!productCount) {
      await tx.product.create({ data: { arenaId: auth.arenaId, name: "Água mineral 500 ml", sku: "DEMO-AGUA-500", priceCents: 500, stockQuantity: 100, minStock: 10 } });
    }
    const comanda = await tx.comanda.create({
      data: {
        arenaId: auth.arenaId,
        playerId: player?.id,
        openedByUserId: auth.userId, openedByUserName: auth.userName,
        code: formatComandaCode(),
        cardNumber,
        label,
        type: parsed.data.type
      }
    });
    if (player) await tx.arenaNotification.updateMany({ where: { arenaId: auth.arenaId, type: "COMANDA_OPEN_REQUEST", readAt: null, href: `/comandas?new=client&player=${encodeURIComponent(player.id)}` }, data: { readAt: new Date() } });
    return { comandaId: comanda.id, openedAt: comanda.openedAt.toISOString(), reused: false };
  });

  revalidatePath("/comandas");
  return result;
}

export async function deleteComandaAction(formData: FormData) {
  const auth = await requireRole("ADMIN");
  const comandaId = z.string().trim().min(1).safeParse(formData.get("comandaId"));
  if (!comandaId.success) throw new Error("Comanda inválida.");

  await withArenaTransaction(auth.arenaId, (tx) => deleteComandaWithAudit(tx, auth, comandaId.data));
  revalidatePath("/auditoria");
  revalidatePath("/comandas");
}

export async function openBookingComandasAction(formData: FormData): Promise<{ error?: string; comandaIds?: string[] }> {
  try {
    const auth = await requirePermission("pos:command:create");
    const occurrenceId = z.string().trim().min(1).safeParse(formData.get("occurrenceId"));
    if (!occurrenceId.success) throw new Error("Horário inválido.");

    let selectedPlayerIds: string[] | undefined;
    if (formData.has("playerIds")) { const ids = z.array(z.string().trim().min(1)).min(1, "Selecione ao menos um atleta.").max(100).safeParse(JSON.parse(String(formData.get("playerIds")))); if (!ids.success) throw new Error("Selecione ao menos um atleta da reserva."); selectedPlayerIds = [...new Set(ids.data)]; }
    const comandaIds = await withArenaTransaction(auth.arenaId, async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ScheduleOccurrence" WHERE id = ${occurrenceId.data} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
      const occurrence = await tx.scheduleOccurrence.findFirst({ where: { id: occurrenceId.data, arenaId: auth.arenaId, status: { not: "CANCELED" } }, include: { participants: { include: { player: { select: { name: true } }, financialEntry: { select: { arenaId: true, playerId: true, type: true } } } } } });
      if (!occurrence) throw new Error("Horário não encontrado.");
      if (occurrence.bookingTypeName === "Bloqueio") throw new Error("Este horário está bloqueado.");
      if (occurrence.status === "PENDING_PAYMENT") throw new Error("Esta reserva aguarda confirmação do pagamento online.");
      if (!occurrence.participants.length) throw new Error("Não é possível abrir comandas: esta reserva não possui cliente atribuído.");
      if (selectedPlayerIds?.some(id => !occurrence.participants.some(participant => participant.playerId === id))) throw new Error("Um dos atletas selecionados não pertence a esta reserva.");
      const participants = selectedPlayerIds ? occurrence.participants.filter(participant => selectedPlayerIds.includes(participant.playerId)) : occurrence.participants;
      for (const playerId of participants.map(participant => participant.playerId).sort()) {
        await tx.$queryRaw`SELECT id FROM "Player" WHERE id = ${playerId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
      }
      const ids: string[] = [];
      for (const participant of participants) {
        if (participant.financialEntryId && (!participant.financialEntry || participant.financialEntry.arenaId !== auth.arenaId || (participant.financialEntry.playerId && participant.financialEntry.playerId !== participant.playerId) || !["REVENUE", "INCOME"].includes(participant.financialEntry.type))) throw new Error("A cobrança da reserva não está disponível para este atleta. Revise o lançamento financeiro.");
        let existing = await tx.comanda.findFirst({ where: { arenaId: auth.arenaId, playerId: participant.playerId, status: "OPEN" }, select: { id: true } });
        if (existing) {
          await tx.$queryRaw`SELECT id FROM "Comanda" WHERE id = ${existing.id} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
          existing = await tx.comanda.findFirst({ where: { id: existing.id, arenaId: auth.arenaId, status: "OPEN" }, select: { id: true } });
        }
        if (!existing) await assertComandaMayOpen(tx, auth.arenaId, participant.playerId);
        const command = existing ?? await tx.comanda.create({ data: { arenaId: auth.arenaId, playerId: participant.playerId, openedByUserId: auth.userId, openedByUserName: auth.userName, label: participant.player.name, type: "CLIENT", code: formatComandaCode() } });
        if (!participant.financialEntryId && participant.amountCents > 0 && !participant.paymentMethod) {
          const entry = await tx.financialEntry.create({ data: { arenaId: auth.arenaId, playerId: participant.playerId, counterpartyName: participant.player.name, type: "REVENUE", category: "Reserva", source: "SCHEDULE_BOOKING", externalReference: occurrence.id, description: `${occurrence.bookingTypeName} · ${participant.player.name}`, amountCents: participant.amountCents, status: "PENDING", dueDate: occurrence.startsAt } });
          await tx.scheduleParticipant.update({ where: { id: participant.id }, data: { financialEntryId: entry.id } });
        }
        await tx.comandaBookingService.upsert({ where: { comandaId_participantId: { comandaId: command.id, participantId: participant.id } }, create: { comandaId: command.id, participantId: participant.id }, update: {} });
        ids.push(command.id);
      }
      return ids;
    });
    revalidatePath("/comandas");
    return { comandaIds };
  } catch (reason) {
    return { error: reason instanceof Error ? reason.message : "Não foi possível abrir as comandas." };
  }
}

export async function addComandaProductAction(formData: FormData) {
  const durationMinutes = z.coerce.number().int().min(1).max(1440).parse(formData.get("durationMinutes") || 60);
  const auth = await requirePermission("pos:command:items");
  const parsed = comandaProductSchema.safeParse({ comandaId: formData.get("comandaId"), productId: formData.get("productId"), quantity: formData.get("quantity") || 1 });
  if (!parsed.success) throw new Error("Produto inválido.");

  await withArenaTransaction(auth.arenaId, tx => appendComandaProduct(tx, auth.arenaId, { ...parsed.data, choices: parseIngredientChoices(formData), durationMinutes }));
  revalidatePath("/comandas");
}

export async function requestPortalComandaCloseAction(formData: FormData) {
  const parsed = z.object({ arenaSlug: z.string().trim().min(1).max(120), comandaId: z.string().min(1).max(100) }).safeParse({ arenaSlug: formData.get("arenaSlug"), comandaId: formData.get("comandaId") });
  if (!parsed.success) throw new Error("Comanda inválida.");
  const auth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  await withArenaTransaction(auth.arenaId, async tx => {
    const portalSettings = await tx.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId }, select: { portalConsumptionEnabled: true } });
    if (portalSettings?.portalConsumptionEnabled === false) throw new Error("A arena desativou comandas pelo Portal. Procure a recepção.");
    await tx.$queryRaw`SELECT id FROM "Comanda" WHERE id = ${parsed.data.comandaId} AND "arenaId" = ${auth.arenaId} AND "playerId" = ${auth.playerId} FOR UPDATE`;
    const comanda = await tx.comanda.findFirst({ where: { id: parsed.data.comandaId, arenaId: auth.arenaId, playerId: auth.playerId, status: "OPEN" }, select: { id: true, code: true, closeRequestedAt: true } });
    if (!comanda) throw new Error("Esta comanda não está disponível.");
    if (comanda.closeRequestedAt) return;
    await tx.comanda.update({ where: { id: comanda.id }, data: { closeRequestedAt: new Date(), closeRequestedByPlayerId: auth.playerId } });
    await tx.arenaNotification.create({ data: { arenaId: auth.arenaId, type: "COMANDA_CLOSE_REQUEST", title: "Fechamento de comanda solicitado", message: `${auth.name} pediu o fechamento da comanda ${comanda.code}.`, href: `/comandas?ids=${encodeURIComponent(comanda.id)}` } });
    await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.playerId, actorName: auth.name, action: "COMANDA_CLOSE_REQUEST", entityId: comanda.id, details: { source: "ATHLETE_PORTAL" } } });
  });
  revalidatePath("/comandas"); revalidatePath("/home"); revalidatePath(`/classificacao/${parsed.data.arenaSlug}`);
}

export async function requestPortalComandaProductAction(formData: FormData) {
  const arenaSlug = z.string().trim().min(1).safeParse(formData.get("arenaSlug"));
  const parsed = comandaProductSchema.safeParse({ comandaId: formData.get("comandaId"), productId: formData.get("productId"), quantity: formData.get("quantity") || 1 });
  if (!arenaSlug.success || !parsed.success) throw new Error("Pedido inválido.");
  const auth = await requirePublicPlayerAuth(arenaSlug.data);
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const portalSettings = await tx.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId }, select: { portalConsumptionEnabled: true } });
    if (portalSettings?.portalConsumptionEnabled === false) throw new Error("A arena desativou comandas pelo Portal. Procure a recepção.");
    const [comanda, product] = await Promise.all([
      tx.comanda.findFirst({ where: { id: parsed.data.comandaId, arenaId: auth.arenaId, playerId: auth.playerId, status: "OPEN" }, select: { id: true } }),
      tx.product.findFirst({ where: { id: parsed.data.productId, arenaId: auth.arenaId, active: true, stockQuantity: { gt: 0 } }, select: { id: true, name: true, priceCents: true } }),
    ]);
    if (!comanda) throw new Error("Esta comanda não está mais aberta.");
    if (!product) throw new Error("Produto indisponível no momento.");
    await assertAggregateAvailability(tx, auth.arenaId, [{ productId: product.id, quantity: parsed.data.quantity }]);
    const player = await tx.player.findFirst({ where: { id: auth.playerId, arenaId: auth.arenaId }, select: { name: true } });
    await tx.comandaRequest.create({ data: { comandaId: comanda.id, productId: product.id, quantity: parsed.data.quantity } });
    await tx.arenaNotification.create({ data: { arenaId: auth.arenaId, type: "COMANDA_REQUEST", title: `Novo pedido na comanda ${comanda.id.slice(-6).toUpperCase()}`, message: `${player?.name ?? "Cliente"} solicitou ${parsed.data.quantity}× ${product.name}. Confirme e lance o item na comanda.`, href: "/comandas" } });
  });
  revalidatePath(`/classificacao/${arenaSlug.data}`);
  revalidatePath("/comandas");
}

export async function updateComandaItemQuantityAction(formData: FormData) {
  const auth = await requirePermission("pos:command:items");
  const parsed = itemQuantitySchema.safeParse({ itemId: formData.get("itemId"), delta: formData.get("delta") });
  if (!parsed.success) throw new Error("Ajuste inválido.");

  await withArenaTransaction(auth.arenaId, async (tx) => {
    const item = await tx.comandaItem.findFirst({ where: { id: parsed.data.itemId, comanda: { arenaId: auth.arenaId, status: "OPEN" } }, include: { product: { select: { stockQuantity: true } } } });
    if (!item) throw new Error("Item não encontrado.");
    const nextQuantity = item.quantity + parsed.data.delta;
    if (nextQuantity <= 0) { await tx.comandaItem.delete({ where: { id: item.id } }); return; }
    await tx.comandaItem.update({ where: { id: item.id }, data: { quantity: nextQuantity, totalCents: item.unitPriceCents * nextQuantity } });
  });
  revalidatePath("/comandas");
}

export async function finishComandaAction(formData: FormData) {
  const auth = await requirePermission("pos:command:finish");
  let payments: unknown = [];
  let debtIds: unknown = [];
  let shares: unknown = [];
  const rawShares = formData.get("shares");
  if (typeof rawShares === "string" && rawShares.trim()) { try { shares = JSON.parse(rawShares); } catch { throw new Error("Divisão inválida."); } }
  const rawPayments = formData.get("payments");
  const rawDebtIds = formData.get("debtIds");
  if (typeof rawPayments === "string" && rawPayments.trim()) {
    try { payments = JSON.parse(rawPayments); } catch { throw new Error("Pagamentos inválidos."); }
  }
  if (typeof rawDebtIds === "string" && rawDebtIds.trim()) {
    try { debtIds = JSON.parse(rawDebtIds); } catch { throw new Error("Débitos inválidos."); }
  }
  const parsed = finishComandaSchema.safeParse({ comandaId: formData.get("comandaId"), shares, payments, debtIds, creditCents: formData.get("creditCents") ?? 0, allowEmpty: formData.get("allowEmpty") ?? false, allowPartial: formData.get("allowPartial") ?? false, fiscalDocumentType: formData.get("fiscalDocumentType") ?? "" });
  if (!parsed.success) throw new Error("Comanda inválida.");
  if (parsed.data.payments.some(payment => /^(saldo\b|credito (do cliente|em conta)\b)/.test(payment.paymentMethod.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()))) throw new Error("Para usar saldo, ative Usar saldo. O valor será validado e descontado da conta do cliente.");

  const whatsappIds = await withArenaTransaction(auth.arenaId, async (tx) => {
    const owner = await tx.comanda.findFirst({ where: { id: parsed.data.comandaId, arenaId: auth.arenaId, status: "OPEN" }, select: { playerId: true } });
    if (owner?.playerId) await tx.$queryRaw`SELECT id FROM "Player" WHERE id = ${owner.playerId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Comanda" WHERE id = ${parsed.data.comandaId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const comanda = await tx.comanda.findFirst({ where: { id: parsed.data.comandaId, arenaId: auth.arenaId, status: "OPEN" }, include: { items: { include: { product: true } }, bookingServices: { include: { participant: { select: { financialEntryId: true, financialEntry: { select: { status: true } }, occurrence: { select: { status: true } } } } } } } });
    if (!comanda) throw new Error("Comanda não está disponível.");
    for (const bankAccountId of new Set(parsed.data.payments.map(payment => payment.bankAccountId))) await requireReceivingBankAccount(tx, auth.arenaId, bankAccountId);
    const operational = await tx.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId } });
    const automaticDebtIds = (comanda.bookingServices ?? []).flatMap(({ participant }) => participant.financialEntryId && ["PENDING", "OVERDUE", "PARTIAL"].includes(participant.financialEntry?.status ?? "") ? [participant.financialEntryId] : []);
    const debtIdsToSettle = [...new Set([...parsed.data.debtIds, ...automaticDebtIds])];
    for (const debtId of [...debtIdsToSettle].sort()) await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id = ${debtId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    if (!comanda.items.length && !debtIdsToSettle.length) {
      if (!parsed.data.allowEmpty) throw new Error("Confirme o encerramento da comanda zerada.");
      await tx.comanda.update({ where: { id: comanda.id }, data: { status: "CLOSED", closedAt: new Date() } });
      if (operational?.whatsappPaidEnabled) return enqueueComandaWhatsapp(tx, auth.arenaId, comanda, operational, [{ playerId: comanda.playerId, amountCents: 0, outstandingCents: 0 }]);
      return;
    }
    const totalCents = comanda.items.reduce((total, item) => total + item.totalCents, 0);
    const clientCreditCents = comanda.playerId ? Math.max(0, (await tx.clientBalanceMovement.aggregate({ where: { arenaId: auth.arenaId, playerId: comanda.playerId, kind: "MONEY" }, _sum: { amountCents: true } }))._sum.amountCents ?? 0) : 0;
    if (parsed.data.creditCents && !comanda.playerId) throw new Error("Saldo de cliente só pode ser usado em comandas vinculadas a um cliente.");
    if (parsed.data.creditCents > clientCreditCents) throw new Error("O saldo disponível do cliente foi alterado. Atualize a comanda e tente novamente.");
    const paymentTotalCents = parsed.data.payments.reduce((total, payment) => total + payment.amountCents, 0);
    const selectedDebts = comanda.playerId && debtIdsToSettle.length ? await tx.financialEntry.findMany({
      where: selectedComandaDebtWhere(auth.arenaId, debtIdsToSettle),
      select: { id: true, playerId: true, amountCents: true, onlinePaymentId: true, onlinePaymentUrl: true, onlinePaymentClaimMethod: true, onlinePaymentClaimedAt: true, notes: true, onlinePaymentItems: { select: { checkout: { select: { status: true, mercadoPagoPaymentId: true, checkoutUrl: true } } } }, settlements: { select: { amountCents: true, interestCents: true, discountCents: true } }, scheduleParticipant: { select: { playerId: true } }, sale: { select: { comanda: { select: { playerId: true } } } } }
    }) : [];
    if (selectedDebts.length !== debtIdsToSettle.length || selectedDebts.some((debt) => comandaDebtOwnerId(debt) !== comanda.playerId)) throw new Error("Um dos débitos selecionados não está disponível para este cliente.");
    if (selectedDebts.some(debt => Boolean(debt.onlinePaymentId || debt.onlinePaymentUrl || debt.onlinePaymentClaimMethod || debt.onlinePaymentClaimedAt) || debt.notes.includes("[MP_REVIEW:") || debt.onlinePaymentItems.some(({ checkout }) => ["PENDING", "REVIEW", "PAID"].includes(checkout.status) || (checkout.status === "FAILED" && Boolean(checkout.mercadoPagoPaymentId || checkout.checkoutUrl))))) throw new Error("Um dos débitos possui pagamento online emitido ou em análise. Confira e concilie a cobrança antes de quitá-lo na comanda.");
    const selectedDebtBalances = selectedDebts
      .map((debt) => ({
        financialEntryId: debt.id,
        outstandingCents: getOutstandingCents(debt.amountCents, debt.settlements)
      }))
      .filter((debt) => debt.outstandingCents > 0);
    if (selectedDebtBalances.length !== selectedDebts.length) throw new Error("Um dos débitos selecionados já foi quitado.");
    const selectedDebtTotalCents = selectedDebtBalances.reduce((total, debt) => total + debt.outstandingCents, 0);
    const grandTotalCents = totalCents + selectedDebtTotalCents;
    const sharedParts = parsed.data.shares.length ? parsed.data.shares : [{ playerId: comanda.playerId, amountCents: totalCents }];
    if (parsed.data.creditCents > sharedParts[0].amountCents + selectedDebtTotalCents) throw new Error("Os pagamentos e o saldo utilizado excedem as partes da comanda.");
    const creditAppliedCents = parsed.data.creditCents;
    // Preserve credit on the owner's products first; any remainder pays their own debts/reservation.
    const productCreditCents = Math.min(creditAppliedCents, sharedParts[0].amountCents);
    const debtCreditCents = creditAppliedCents - productCreditCents;
    const paymentPolicy = applyComandaPaymentPolicy({ totalCents: grandTotalCents, creditCents: creditAppliedCents, payments: parsed.data.payments, preventOverpayment: operational?.preventOverpayment ?? true, requireFullPayment: operational?.requireFullPayment ?? false, allowPartial: parsed.data.allowPartial, playerId: comanda.playerId });
    await assertComandaCashRegister(tx, auth.arenaId, operational?.cashRegisterRequired ?? false, paymentTotalCents > 0);
    const creditDebtAllocation = allocatePaymentsToDebts(selectedDebtBalances, debtCreditCents ? [{ paymentMethod: "Saldo do cliente", amountCents: debtCreditCents }] : []);
    const remainingDebtBalances = selectedDebtBalances.map(debt => ({ ...debt, outstandingCents: debt.outstandingCents - creditDebtAllocation.settlements.filter(settlement => settlement.financialEntryId === debt.financialEntryId).reduce((sum, settlement) => sum + settlement.amountCents, 0) })).filter(debt => debt.outstandingCents > 0);
    const cashDebtAllocation = allocatePaymentsToDebts(remainingDebtBalances, paymentPolicy.appliedPayments);
    const debtPaymentAllocation = { remainingPayments: cashDebtAllocation.remainingPayments, settlements: [...creditDebtAllocation.settlements, ...cashDebtAllocation.settlements] };
    const partialDebtPaymentCents = debtPaymentAllocation.settlements.reduce((total, settlement) => total + settlement.amountCents, 0);
    const settleSelectedDebts = Boolean(selectedDebts.length) && partialDebtPaymentCents >= selectedDebtTotalCents;
    const comandaPaymentCents = debtPaymentAllocation.remainingPayments.reduce((total, payment) => total + payment.amountCents, 0);
    const remainingCents = totalCents - comandaPaymentCents - productCreditCents;
    if (sharedParts[0].playerId !== comanda.playerId || sharedParts.slice(1).some(part => !part.playerId || part.amountCents <= 0)) throw new Error("A divisão deve manter o titular e identificar cada outra pessoa.");
    const otherIds = sharedParts.slice(1).map(part => part.playerId!);
    const otherPlayers = otherIds.length ? await tx.player.findMany({ where: { arenaId: auth.arenaId, id: { in: otherIds }, active: true }, select: { id: true, name: true } }) : [];
    if (otherPlayers.length !== otherIds.length) throw new Error("Uma das pessoas selecionadas não está disponível nesta arena.");
    const allocations = allocateComandaShares(sharedParts, totalCents, comandaPaymentCents, productCreditCents);
    const now = new Date();
    const sale = await tx.sale.create({
      data: {
        arenaId: auth.arenaId,
        comandaId: comanda.id,
        code: `VEN-${Date.now().toString(36).toUpperCase()}`,
        customerName: comanda.label,
        paymentMethod: parsed.data.payments.length + (creditAppliedCents ? 1 : 0) === 1 ? (creditAppliedCents ? "Saldo do cliente" : parsed.data.payments[0].paymentMethod) : parsed.data.payments.length || creditAppliedCents ? "MÚLTIPLO" : "",
        status: remainingCents ? (comandaPaymentCents + productCreditCents ? "PARTIAL" : "PENDING") : "PAID",
        totalCents,
        items: { create: comanda.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPriceCents: item.unitPriceCents, totalCents: item.totalCents, variantKey: item.variantKey, compositionLabel: item.compositionLabel, stockRecipe: item.stockRecipe ?? undefined, fiscalProfile: item.product.fiscalProfile as object })) }
      }
    });
    const cashReceivedCents = parsed.data.payments
      .filter((payment) => ["dinheiro", "cash"].includes(payment.paymentMethod.trim().toLocaleLowerCase("pt-BR")))
      .reduce((total, payment) => total + payment.amountCents, 0);
    if (cashReceivedCents > 0) {
      await recordCashSaleIfOpen(tx, { arenaId: auth.arenaId, referenceDate: cashReferenceDate(now), amountCents: cashReceivedCents, description: `Comanda ${comanda.code}`, createdByName: auth.userName });
    }
    await consumeProductStock(tx, auth.arenaId, comanda.items, `Comanda ${comanda.code}`, sale.id);

    if (paymentPolicy.excessCents && comanda.playerId) {
      await tx.clientBalanceMovement.create({ data: { arenaId: auth.arenaId, playerId: comanda.playerId, kind: "MONEY", amountCents: paymentPolicy.excessCents, reason: `Crédito de pagamento excedente na comanda ${comanda.code}` } });
      for (const payment of paymentPolicy.excessPayments) {
        await tx.financialEntry.create({ data: { arenaId: auth.arenaId, playerId: comanda.playerId, bankAccountId: payment.bankAccountId, type: "INCOME", category: "CREDITO_DE_CLIENTE", description: `Crédito de pagamento excedente na comanda ${comanda.code}`, amountCents: payment.amountCents, paymentMethod: payment.paymentMethod, status: "PAID", paidAt: now } });
      }
    }
    if (paymentPolicy.partialOverride) await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName, action: "COMANDA_PARTIAL_PAYMENT_OVERRIDE", entityId: comanda.id, details: { outstandingCents: paymentPolicy.outstandingCents } } });
    if (creditAppliedCents && comanda.playerId) {
      if (productCreditCents) await tx.salePayment.create({ data: { saleId: sale.id, paymentMethod: "Saldo do cliente", amountCents: productCreditCents } });
      await tx.clientBalanceMovement.create({ data: { arenaId: auth.arenaId, playerId: comanda.playerId, kind: "MONEY", amountCents: -creditAppliedCents, reason: `Saldo utilizado na comanda ${comanda.code}` } });
    }
    for (const payment of debtPaymentAllocation.remainingPayments) {
      await tx.salePayment.create({ data: { saleId: sale.id, bankAccountId: payment.bankAccountId, paymentMethod: payment.paymentMethod, amountCents: payment.amountCents } });
      await tx.financialEntry.create({ data: { arenaId: auth.arenaId, saleId: sale.id, playerId: comanda.playerId, counterpartyName: comanda.label, bankAccountId: payment.bankAccountId, type: "REVENUE", category: "COMANDAS", source: "COMANDA", dueDate: now, description: `Recebimento da comanda ${comanda.code}`, amountCents: payment.amountCents, paymentMethod: payment.paymentMethod, status: "PAID", paidAt: now } });
    }
    for (const settlement of debtPaymentAllocation.settlements) {
      await tx.financialSettlement.create({
        data: {
          arenaId: auth.arenaId,
          financialEntryId: settlement.financialEntryId,
          bankAccountId: settlement.bankAccountId,
          saleId: sale.id,
          amountCents: settlement.amountCents,
          paymentMethod: settlement.paymentMethod,
          paidAt: now,
          notes: `Baixa realizada junto à finalização da comanda ${comanda.code}.`
        }
      });
    }
    for (const debt of selectedDebts) {
      const newSettledCents = debtPaymentAllocation.settlements
        .filter((settlement) => settlement.financialEntryId === debt.id)
        .reduce((total, settlement) => total + settlement.amountCents, 0);
      if (!newSettledCents) continue;
      const outstandingCents = getOutstandingCents(debt.amountCents, [
        ...debt.settlements,
        { amountCents: newSettledCents }
      ]);
      if (outstandingCents === 0) {
        await tx.financialEntry.update({ where: { id: debt.id }, data: { status: "PAID", paidAt: now } });
      }
    }
    for (const allocation of allocations.filter(part => part.outstandingCents > 0)) {
      const payer = allocation.playerId === comanda.playerId ? comanda.label : otherPlayers.find(player => player.id === allocation.playerId)!.name;
      await tx.financialEntry.create({ data: { arenaId: auth.arenaId, saleId: sale.id, playerId: allocation.playerId, type: "REVENUE", category: "COMANDAS", description: parsed.data.shares.length ? `Parte da comanda ${comanda.code} · ${payer}` : `Conta a receber da comanda ${comanda.code}`, amountCents: allocation.outstandingCents, status: "PENDING", dueDate: now } });
    }
    if (parsed.data.shares.length) await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName, action: "COMANDA_SPLIT", entityId: comanda.id, details: { saleId: sale.id, allocations } } });

    if (parsed.data.fiscalDocumentType) {
      if (!parsed.data.payments.length && !creditAppliedCents) throw new Error("Informe um recebimento para emitir o documento fiscal da comanda.");
      await issueManualFiscalDocument(tx, {
        arenaId: auth.arenaId,
        documentType: parsed.data.fiscalDocumentType as FiscalDocumentType,
        totalCents,
        customerName: comanda.label,
        saleId: sale.id,
      });
    }
    await tx.comanda.update({ where: { id: comanda.id }, data: { status: "CLOSED", closedAt: now } });
    if (operational?.whatsappPaidEnabled || operational?.whatsappUnpaidEnabled) return enqueueComandaWhatsapp(tx, auth.arenaId, comanda, operational, allocations.map((part, index) => ({ playerId: part.playerId, amountCents: part.amountCents + (index === 0 ? selectedDebtTotalCents : 0), outstandingCents: part.outstandingCents + (index === 0 ? Math.max(0, selectedDebtTotalCents - partialDebtPaymentCents) : 0) })));
  });
  if (whatsappIds?.length) after(async () => { for (const id of whatsappIds) { try { await dispatchComandaWhatsapp(auth.arenaId, id); } catch { console.warn("Mensagem da comanda permanece pendente", id); } } });
  revalidatePath("/comandas");
  revalidatePath("/home");
  revalidatePath("/financeiro/lancamentos");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/painel");
  revalidatePath("/pdv/caixa");
  revalidatePath("/relatorios/caixa");
}

export async function requestPortalComandaOpenAction(form: FormData) {
  const arenaSlug = z.string().trim().min(1).max(120).parse(form.get("arenaSlug"));
  const auth = await requirePublicPlayerAuth(arenaSlug);
  await withArenaTransaction(auth.arenaId, async tx => {
    await tx.$queryRaw`SELECT id FROM "Player" WHERE id = ${auth.playerId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const settings = await tx.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId }, select: { portalConsumptionEnabled: true } });
    if (settings?.portalConsumptionEnabled === false) throw new Error("Comandas pelo Portal estão desativadas nesta arena.");
    const player = await tx.player.findFirst({ where: { id: auth.playerId, arenaId: auth.arenaId, active: true }, select: { id: true } });
    if (!player) throw new Error("Cadastro indisponível. Procure a recepção.");
    const existing = await tx.comanda.findFirst({ where: { arenaId: auth.arenaId, playerId: auth.playerId, status: "OPEN" }, select: { id: true } });
    if (existing) throw new Error("Você já tem uma comanda aberta. Atualize a consulta.");
    const href = `/comandas?new=client&player=${encodeURIComponent(auth.playerId)}`;
    const pending = await tx.arenaNotification.findFirst({ where: { arenaId: auth.arenaId, type: "COMANDA_OPEN_REQUEST", readAt: null, href }, select: { id: true } });
    if (pending) return;
    await tx.arenaNotification.create({ data: { arenaId: auth.arenaId, type: "COMANDA_OPEN_REQUEST", title: "Abertura de comanda solicitada", message: `${auth.name} solicitou uma comanda pelo Portal.`, href } });
    await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.playerId, actorName: auth.name, action: "COMANDA_OPEN_REQUEST", entityId: auth.playerId, details: { source: "ATHLETE_PORTAL" } } });
  });
  revalidatePath("/comandas"); revalidatePath("/home");
}

export async function requestPortalComandaOrderAction(formData: FormData) {
  const arenaSlug = z.string().trim().min(1).parse(formData.get("arenaSlug"));
  const auth = await requirePublicPlayerAuth(arenaSlug);
  let items: unknown;
  try { items = JSON.parse(String(formData.get("items") ?? "")); } catch { throw new Error("Pedido inválido."); }
  const parsed = z.object({ comandaId: z.string().min(1), orderId: z.string().uuid(), items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(999), choices: ingredientChoicesSchema.optional() })).min(1).max(50) }).safeParse({ comandaId: formData.get("comandaId"), orderId: formData.get("orderId"), items });
  if (!parsed.success) throw new Error("Revise os produtos e quantidades do pedido.");
  await withArenaTransaction(auth.arenaId, tx => submitPortalOrder(tx, { ...parsed.data, arenaId: auth.arenaId, playerId: auth.playerId }));
  revalidatePath("/comandas");
}

export async function confirmPortalComandaRequestAction(formData: FormData) {
  const auth = await requirePermission("pos:command:items");
  const requestId = z.string().min(1).parse(formData.get("requestId"));
  await withArenaTransaction(auth.arenaId, tx => confirmPortalOrderItem(tx, auth.arenaId, requestId));
  revalidatePath("/comandas");
}
