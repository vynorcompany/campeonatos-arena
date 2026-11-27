import "server-only";
import { ComandaOperationError, publicComandaError } from "@/lib/backend/comanda-operation-error";

import { lockTournamentRegistrationEntriesForReceipt, syncTournamentRegistrationAfterReceipt } from "@/lib/tournaments/registration-receivable";
import { createCardInstallmentEntries } from "@/lib/finance/card-installment-service";
import { customizedCardInstallments } from "@/lib/finance/card-installments";
import { ingredientChoicesSchema } from "@/lib/products/composition";
import { consumeProductStock, assertAggregateAvailability } from "@/lib/products/stock-aggregates";
import { requireReceivingBankAccount } from "@/lib/finance/receiving-bank-account";
import { appendComandaProduct, confirmPortalOrderItem, submitPortalOrder } from "@/lib/comandas/portal-orders";
import { after } from "next/server";
import { enqueueComandaWhatsapp } from "@/lib/comandas/whatsapp-outbox";
import { dispatchComandaWhatsapp } from "@/lib/comandas/whatsapp-delivery";
import { calculateComandaDiscounts, applyComandaPaymentPolicy, assertComandaMayOpen, assertComandaCashRegister } from "@/lib/comandas/operational-policy";
import { allocateComandaLines, allocateComandaShares } from "@/lib/comandas/split";
import { deleteComandaWithAudit } from "@/lib/comandas/delete-with-audit";
import { arenaDatabase } from "@/lib/arena-database";

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

function parseIngredientChoices(formData: FormData) { try { return ingredientChoicesSchema.parse(JSON.parse(String(formData.get("choices") ?? "{}"))); } catch { throw new ComandaOperationError("Revise as opções do produto."); } }

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
  amountCents: z.coerce.number().int().positive(),
  installmentCount: z.number().int().min(2).max(36).optional(),
  installmentRows: z.array(z.object({ dueDate: z.string(), amountCents: z.number().int().positive() })).max(36).optional(),
  firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
})).max(8);

const finishComandaSchema = z.object({
  discountMode: z.enum(["TOTAL", "ITEMS"]).default("TOTAL"),
  discountCents: z.coerce.number().int().min(0).max(2147483647).default(0),
  itemDiscounts: z.array(z.object({kind:z.enum(["ITEM","DEBT"]),id:z.string().min(1),amountCents:z.number().int().min(0).max(2147483647)})).max(500).default([]),
  quotedTotalCents: z.coerce.number().int().min(0).max(2147483647).optional(),
  splitIncludesBookings: z.preprocess(value => value === true || value === "true", z.boolean()).default(false),
  splitItemIds: z.array(z.string().min(1)).max(500).default([]),
  fiscalCustomerDocument: z.string().trim().max(18).default(""),
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
  const requestedDate = formData.get("date");
  if (requestedDate && requestedDate !== cashReferenceDate(new Date()).toISOString().slice(0, 10)) {
    throw new ComandaOperationError("Comandas só podem ser abertas no dia vigente.");
  }
  const parsed = comandaSchema.safeParse({
    type: formData.get("type"),
    cardNumber: formData.get("cardNumber") || undefined,
    playerId: formData.get("playerId") || undefined,
    label: formData.get("label") || undefined
  });

  if (!parsed.success) {
    throw new ComandaOperationError("Dados da comanda inválidos.");
  }

  let player: { id: string; name: string } | null = null;
  if (parsed.data.type === "CLIENT") {
    if (!parsed.data.playerId) {
      throw new ComandaOperationError("Selecione o cliente da comanda.");
    }

    player = await prisma.player.findFirst({
      where: { id: parsed.data.playerId, arenaId: auth.arenaId, active: true },
      select: { id: true, name: true }
    });

    if (!player) {
      throw new ComandaOperationError("Cliente não encontrado.");
    }
  }

  const label = parsed.data.type === "CLIENT" ? player!.name : parsed.data.label;
  if (!label) {
    throw new ComandaOperationError("Informe um nome para a comanda avulsa.");
  }

  const result = await withArenaTransaction(auth.arenaId, async (tx) => {
    const operational = await tx.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId }, select: { comandaCardsEnabled: true } });
    const cardNumber = parsed.data.cardNumber?.toUpperCase();
    if (cardNumber && !operational?.comandaCardsEnabled) throw new ComandaOperationError("Cartões de comanda não estão habilitados nesta arena.");
    if (cardNumber) {
      await tx.$queryRaw`SELECT id FROM "ArenaOperationalSettings" WHERE "arenaId" = ${auth.arenaId} FOR UPDATE`;
      const used = await tx.comanda.findFirst({ where: { arenaId: auth.arenaId, status: "OPEN", cardNumber }, select: { playerId: true } });
      if (used && (!player || used.playerId !== player.id)) throw new ComandaOperationError("Este cartão já está em uso em outra comanda aberta.");
    }
    if (player) {
      await tx.$queryRaw`SELECT id FROM "Player" WHERE id = ${player.id} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
      const existing = await tx.comanda.findFirst({
        where: { arenaId: auth.arenaId, playerId: player.id, status: "OPEN" },
        select: { id: true, openedAt: true, cardNumber: true }
      });
      if (existing) {
        await tx.arenaNotification.updateMany({ where: { arenaId: auth.arenaId, type: "COMANDA_OPEN_REQUEST", readAt: null, href: `/comandas?new=client&player=${encodeURIComponent(player.id)}` }, data: { readAt: new Date() } });
        if (cardNumber && existing.cardNumber && existing.cardNumber !== cardNumber) throw new ComandaOperationError("O cliente já tem uma comanda aberta com outro cartão.");
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


  return result;
}

export async function deleteComandaAction(formData: FormData) {
  const auth = await requireRole("ADMIN");
  const comandaId = z.string().trim().min(1).safeParse(formData.get("comandaId"));
  if (!comandaId.success) throw new ComandaOperationError("Comanda inválida.");

  await withArenaTransaction(auth.arenaId, (tx) => deleteComandaWithAudit(tx, auth, comandaId.data));


}

export async function openBookingComandasAction(formData: FormData): Promise<{ error?: string; comandaIds?: string[] }> {
  try {
    const auth = await requirePermission("pos:command:create");
    const occurrenceId = z.string().trim().min(1).safeParse(formData.get("occurrenceId"));
    if (!occurrenceId.success) throw new ComandaOperationError("Horário inválido.");

    let selectedPlayerIds: string[] | undefined;
    if (formData.has("playerIds")) { const ids = z.array(z.string().trim().min(1)).min(1, "Selecione ao menos um atleta.").max(100).safeParse(JSON.parse(String(formData.get("playerIds")))); if (!ids.success) throw new ComandaOperationError("Selecione ao menos um atleta da reserva."); selectedPlayerIds = [...new Set(ids.data)]; }
    const comandaIds = await withArenaTransaction(auth.arenaId, async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ScheduleOccurrence" WHERE id = ${occurrenceId.data} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
      const occurrence = await tx.scheduleOccurrence.findFirst({ where: { id: occurrenceId.data, arenaId: auth.arenaId, status: { not: "CANCELED" } }, include: { participants: { include: { player: { select: { name: true } }, financialEntry: { select: { arenaId: true, playerId: true, type: true } } } } } });
      if (!occurrence) throw new ComandaOperationError("Horário não encontrado.");
      if (occurrence.bookingTypeName === "Bloqueio") throw new ComandaOperationError("Este horário está bloqueado.");
      if (occurrence.status === "PENDING_PAYMENT") throw new ComandaOperationError("Esta reserva aguarda confirmação do pagamento online.");
      if (!occurrence.participants.length) throw new ComandaOperationError("Não é possível abrir comandas: esta reserva não possui cliente atribuído.");
      if (selectedPlayerIds?.some(id => !occurrence.participants.some(participant => participant.playerId === id))) throw new ComandaOperationError("Um dos atletas selecionados não pertence a esta reserva.");
      const participants = selectedPlayerIds ? occurrence.participants.filter(participant => selectedPlayerIds.includes(participant.playerId)) : occurrence.participants;
      for (const playerId of participants.map(participant => participant.playerId).sort()) {
        await tx.$queryRaw`SELECT id FROM "Player" WHERE id = ${playerId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
      }
      const ids: string[] = [];
      for (const participant of participants) {
        if (participant.financialEntryId && (!participant.financialEntry || participant.financialEntry.arenaId !== auth.arenaId || (participant.financialEntry.playerId && participant.financialEntry.playerId !== participant.playerId) || !["REVENUE", "INCOME"].includes(participant.financialEntry.type))) throw new ComandaOperationError("A cobrança da reserva não está disponível para este atleta. Revise o lançamento financeiro.");
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

    return { comandaIds };
  } catch (reason) {
    const error = publicComandaError(reason);
    if (error) return { error };
    throw reason;
  }
}

export async function addComandaProductAction(formData: FormData) {
  const durationMinutes = z.coerce.number().int().min(1).max(1440).parse(formData.get("durationMinutes") || 60);
  const auth = await requirePermission("pos:command:items");
  const parsed = comandaProductSchema.safeParse({ comandaId: formData.get("comandaId"), productId: formData.get("productId"), quantity: formData.get("quantity") || 1 });
  if (!parsed.success) throw new ComandaOperationError("Produto inválido.");

  await withArenaTransaction(auth.arenaId, tx => appendComandaProduct(tx, auth.arenaId, { ...parsed.data, choices: parseIngredientChoices(formData), durationMinutes }));

}

export async function requestPortalComandaCloseAction(formData: FormData) {
  const parsed = z.object({ arenaSlug: z.string().trim().min(1).max(120), comandaId: z.string().min(1).max(100) }).safeParse({ arenaSlug: formData.get("arenaSlug"), comandaId: formData.get("comandaId") });
  if (!parsed.success) throw new ComandaOperationError("Comanda inválida.");
  const auth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  await withArenaTransaction(auth.arenaId, async tx => {
    const portalSettings = await tx.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId }, select: { portalConsumptionEnabled: true } });
    if (portalSettings?.portalConsumptionEnabled === false) throw new ComandaOperationError("A arena desativou comandas pelo Portal. Procure a recepção.");
    await tx.$queryRaw`SELECT id FROM "Comanda" WHERE id = ${parsed.data.comandaId} AND "arenaId" = ${auth.arenaId} AND "playerId" = ${auth.playerId} FOR UPDATE`;
    const comanda = await tx.comanda.findFirst({ where: { id: parsed.data.comandaId, arenaId: auth.arenaId, playerId: auth.playerId, status: "OPEN" }, select: { id: true, code: true, closeRequestedAt: true } });
    if (!comanda) throw new ComandaOperationError("Esta comanda não está disponível.");
    if (comanda.closeRequestedAt) return;
    await tx.comanda.update({ where: { id: comanda.id }, data: { closeRequestedAt: new Date(), closeRequestedByPlayerId: auth.playerId } });
    await tx.arenaNotification.create({ data: { arenaId: auth.arenaId, type: "COMANDA_CLOSE_REQUEST", title: "Fechamento de comanda solicitado", message: `${auth.name} pediu o fechamento da comanda ${comanda.code}.`, href: `/comandas?ids=${encodeURIComponent(comanda.id)}` } });
    await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.playerId, actorName: auth.name, action: "COMANDA_CLOSE_REQUEST", entityId: comanda.id, details: { source: "ATHLETE_PORTAL" } } });
  });

}

export async function requestPortalComandaProductAction(formData: FormData) {
  const arenaSlug = z.string().trim().min(1).safeParse(formData.get("arenaSlug"));
  const parsed = comandaProductSchema.safeParse({ comandaId: formData.get("comandaId"), productId: formData.get("productId"), quantity: formData.get("quantity") || 1 });
  if (!arenaSlug.success || !parsed.success) throw new ComandaOperationError("Pedido inválido.");
  const auth = await requirePublicPlayerAuth(arenaSlug.data);
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const portalSettings = await tx.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId }, select: { portalConsumptionEnabled: true } });
    if (portalSettings?.portalConsumptionEnabled === false) throw new ComandaOperationError("A arena desativou comandas pelo Portal. Procure a recepção.");
    const [comanda, product] = await Promise.all([
      tx.comanda.findFirst({ where: { id: parsed.data.comandaId, arenaId: auth.arenaId, playerId: auth.playerId, status: "OPEN" }, select: { id: true } }),
      tx.product.findFirst({ where: { id: parsed.data.productId, arenaId: auth.arenaId, active: true, stockQuantity: { gt: 0 } }, select: { id: true, name: true, priceCents: true } }),
    ]);
    if (!comanda) throw new ComandaOperationError("Esta comanda não está mais aberta.");
    if (!product) throw new ComandaOperationError("Produto indisponível no momento.");
    await assertAggregateAvailability(tx, auth.arenaId, [{ productId: product.id, quantity: parsed.data.quantity }]);
    const player = await tx.player.findFirst({ where: { id: auth.playerId, arenaId: auth.arenaId }, select: { name: true } });
    await tx.comandaRequest.create({ data: { comandaId: comanda.id, productId: product.id, quantity: parsed.data.quantity } });
    await tx.arenaNotification.create({ data: { arenaId: auth.arenaId, type: "COMANDA_REQUEST", title: `Novo pedido na comanda ${comanda.id.slice(-6).toUpperCase()}`, message: `${player?.name ?? "Cliente"} solicitou ${parsed.data.quantity}× ${product.name}. Confirme e lance o item na comanda.`, href: `/comandas?ids=${encodeURIComponent(comanda.id)}#comanda-${encodeURIComponent(comanda.id)}` } });
  });


}

export async function updateComandaItemQuantityAction(formData: FormData) {
  const auth = await requirePermission("pos:command:items");
  const parsed = itemQuantitySchema.safeParse({ itemId: formData.get("itemId"), delta: formData.get("delta") });
  if (!parsed.success) throw new ComandaOperationError("Ajuste inválido.");

  await withArenaTransaction(auth.arenaId, async (tx) => {
    const owner = await tx.comandaItem.findFirst({ where: { id: parsed.data.itemId, comanda: { arenaId: auth.arenaId, status: "OPEN" } }, select: { comandaId: true } });
    if (!owner) throw new ComandaOperationError("Item não encontrado.");
    await tx.$queryRaw`SELECT id FROM "Comanda" WHERE id = ${owner.comandaId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const item = await tx.comandaItem.findFirst({ where: { id: parsed.data.itemId, comanda: { arenaId: auth.arenaId, status: "OPEN" } }, include: { product: { select: { stockQuantity: true } } } });
    if (!item) throw new ComandaOperationError("Item não encontrado.");
    const nextQuantity = item.quantity + parsed.data.delta;
    if (nextQuantity > 999 || item.unitPriceCents * nextQuantity > 2_147_483_647) throw new ComandaOperationError("Quantidade ou valor acima do limite permitido.");
    if (nextQuantity <= 0) { await tx.comandaItem.delete({ where: { id: item.id } }); return; }
    await tx.comandaItem.update({ where: { id: item.id }, data: { quantity: nextQuantity, totalCents: item.unitPriceCents * nextQuantity } });
  });

}

/** Edit a command line without overwriting a concurrent checkout or another operator's edit. */
export async function editComandaItemAction(formData: FormData) {
  const auth = await requirePermission("pos:command:items");
  const parsed = z.object({
    itemId: z.string().min(1),
    quantity: z.coerce.number().int().min(0).max(999),
    unitPriceCents: z.coerce.number().int().min(0).max(2_147_483_647),
    expectedQuantity: z.coerce.number().int().min(1).max(2_147_483_647),
    expectedUnitPriceCents: z.coerce.number().int().min(0).max(2_147_483_647)
  }).safeParse(Object.fromEntries(["itemId", "quantity", "unitPriceCents", "expectedQuantity", "expectedUnitPriceCents"].map(key => [key, formData.get(key) ?? undefined])));
  if (!parsed.success || !Number.isSafeInteger(parsed.data.quantity * parsed.data.unitPriceCents) || parsed.data.quantity * parsed.data.unitPriceCents > 2_147_483_647) throw new ComandaOperationError("Revise a quantidade e o valor do item.");
  await withArenaTransaction(auth.arenaId, async tx => {
    const owner = await tx.comandaItem.findFirst({ where: { id: parsed.data.itemId, comanda: { arenaId: auth.arenaId, status: "OPEN" } }, select: { comandaId: true } });
    if (!owner) throw new ComandaOperationError("Item não encontrado nesta comanda aberta.");
    await tx.$queryRaw`SELECT id FROM "Comanda" WHERE id = ${owner.comandaId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const item = await tx.comandaItem.findFirst({ where: { id: parsed.data.itemId, comanda: { arenaId: auth.arenaId, status: "OPEN" } } });
    if (!item) throw new ComandaOperationError("Item não encontrado nesta comanda aberta.");
    if (item.quantity !== parsed.data.expectedQuantity || item.unitPriceCents !== parsed.data.expectedUnitPriceCents) throw new ComandaOperationError("O item foi alterado por outra operação. Atualize a comanda antes de editar.");
    const { quantity, unitPriceCents } = parsed.data;
    if (quantity === item.quantity && unitPriceCents === item.unitPriceCents) return;
    if (quantity === 0) await tx.comandaItem.delete({ where: { id: item.id } });
    else await tx.comandaItem.update({ where: { id: item.id }, data: { quantity, unitPriceCents, totalCents: quantity * unitPriceCents } });
    await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName, action: quantity === 0 ? "COMANDA_ITEM_REMOVED" : "COMANDA_ITEM_UPDATED", entityId: item.comandaId, details: { itemId: item.id, productId: item.productId, before: { quantity: item.quantity, unitPriceCents: item.unitPriceCents }, after: { quantity, unitPriceCents } } } });
  });

}

export async function finishComandaAction(formData: FormData) {
  const auth = await requirePermission("pos:command:finish");
  let payments: unknown = [];
  let debtIds: unknown = [];
  let shares: unknown = [];
  const rawShares = formData.get("shares");
  if (typeof rawShares === "string" && rawShares.trim()) { try { shares = JSON.parse(rawShares); } catch { throw new ComandaOperationError("Divisão inválida."); } }
  const rawPayments = formData.get("payments");
  const rawDebtIds = formData.get("debtIds");
  if (typeof rawPayments === "string" && rawPayments.trim()) {
    try { payments = JSON.parse(rawPayments); } catch { throw new ComandaOperationError("Pagamentos inválidos."); }
  }
  if (typeof rawDebtIds === "string" && rawDebtIds.trim()) {
    try { debtIds = JSON.parse(rawDebtIds); } catch { throw new ComandaOperationError("Débitos inválidos."); }
  }
  let itemDiscounts: unknown = [];
  try { itemDiscounts = JSON.parse(String(formData.get("itemDiscounts") ?? "[]")); } catch { throw new ComandaOperationError("Descontos inválidos."); }
  let splitItemIds: unknown = [];
  try { splitItemIds = JSON.parse(String(formData.get("splitItemIds") ?? "[]")); } catch { throw new ComandaOperationError("Itens da divisão inválidos."); }
  const parsed = finishComandaSchema.safeParse({ splitIncludesBookings: formData.get("splitIncludesBookings") ?? false, splitItemIds, discountMode: formData.get("discountMode") ?? "TOTAL", discountCents: formData.get("discountCents") ?? 0, itemDiscounts, quotedTotalCents: formData.get("quotedTotalCents") ?? undefined, comandaId: formData.get("comandaId"), fiscalCustomerDocument: formData.get("fiscalCustomerDocument") ?? "", shares, payments, debtIds, creditCents: formData.get("creditCents") ?? 0, allowEmpty: formData.get("allowEmpty") ?? false, allowPartial: formData.get("allowPartial") ?? false, fiscalDocumentType: formData.get("fiscalDocumentType") ?? "" });
  if (!parsed.success) throw new ComandaOperationError("Comanda inválida.");
  if (parsed.data.payments.some(payment => /^(saldo\b|credito (do cliente|em conta)\b)/.test(payment.paymentMethod.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()))) throw new ComandaOperationError("Para usar saldo, ative Usar saldo. O valor será validado e descontado da conta do cliente.");

  const installmentPayments = parsed.data.payments.filter(payment => payment.installmentCount);
  for (const payment of installmentPayments) {
    if (!/^(cartao de credito|credito|credit_card)$/i.test(payment.paymentMethod.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) throw new ComandaOperationError("Parcelamento disponível somente no cartão de crédito.");
    const first = new Date(`${payment.firstDueDate}T12:00:00Z`);
    if (!payment.firstDueDate || !Number.isFinite(first.getTime()) || first.toISOString().slice(0,10) !== payment.firstDueDate) throw new ComandaOperationError("Informe o vencimento da primeira parcela.");
    customizedCardInstallments(payment.amountCents, payment.installmentCount!, first, payment.installmentRows);
  }
  const installmentTotalCents = installmentPayments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const whatsappIds = await withArenaTransaction(auth.arenaId, async (tx) => {
    if (parsed.data.debtIds.length) await lockTournamentRegistrationEntriesForReceipt(tx, auth.arenaId, parsed.data.debtIds);
    const owner = await tx.comanda.findFirst({ where: { id: parsed.data.comandaId, arenaId: auth.arenaId, status: "OPEN" }, select: { playerId: true } });
    if (owner?.playerId) await tx.$queryRaw`SELECT id FROM "Player" WHERE id = ${owner.playerId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Comanda" WHERE id = ${parsed.data.comandaId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const comanda = await tx.comanda.findFirst({ where: { id: parsed.data.comandaId, arenaId: auth.arenaId, status: "OPEN" }, include: { items: { include: { product: true } }, bookingServices: { include: { participant: { select: { financialEntryId: true, financialEntry: { select: { status: true } }, occurrence: { select: { status: true } } } } } } } });
    if (!comanda) throw new ComandaOperationError("Comanda não está disponível.");
    for (const bankAccountId of new Set(parsed.data.payments.map(payment => payment.bankAccountId))) await requireReceivingBankAccount(tx, auth.arenaId, bankAccountId);
    const operational = await tx.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId } });
    const automaticDebtIds = (comanda.bookingServices ?? []).flatMap(({ participant }) => participant.financialEntryId && ["PENDING", "OVERDUE", "PARTIAL"].includes(participant.financialEntry?.status ?? "") ? [participant.financialEntryId] : []);
    const debtIdsToSettle = [...new Set([...parsed.data.debtIds, ...automaticDebtIds])];
    for (const debtId of [...debtIdsToSettle].sort()) await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id = ${debtId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    if (!comanda.items.length && !debtIdsToSettle.length) {
      if (!parsed.data.allowEmpty) throw new ComandaOperationError("Confirme o encerramento da comanda zerada.");
      await tx.comanda.update({ where: { id: comanda.id }, data: { status: "CLOSED", closedAt: new Date() } });
      if (operational?.whatsappPaidEnabled) return enqueueComandaWhatsapp(tx, auth.arenaId, comanda, operational, [{ playerId: comanda.playerId, amountCents: 0, outstandingCents: 0 }]);
      return;
    }
    const grossProductCents = comanda.items.reduce((total, item) => total + item.totalCents, 0);
    const clientCreditCents = comanda.playerId ? Math.max(0, (await tx.clientBalanceMovement.aggregate({ where: { arenaId: auth.arenaId, playerId: comanda.playerId, kind: "MONEY" }, _sum: { amountCents: true } }))._sum.amountCents ?? 0) : 0;
    if (parsed.data.creditCents && !comanda.playerId) throw new ComandaOperationError("Saldo de cliente só pode ser usado em comandas vinculadas a um cliente.");
    if (parsed.data.creditCents > clientCreditCents) throw new ComandaOperationError("O saldo disponível do cliente foi alterado. Atualize a comanda e tente novamente.");
    const paymentTotalCents = parsed.data.payments.reduce((total, payment) => total + payment.amountCents, 0);
    const selectedDebts = comanda.playerId && debtIdsToSettle.length ? await tx.financialEntry.findMany({
      where: selectedComandaDebtWhere(auth.arenaId, debtIdsToSettle),
      select: { id: true, source: true, playerId: true, category: true, description: true, dueDate: true, competenceDate: true, externalReference: true, amountCents: true, onlinePaymentId: true, onlinePaymentUrl: true, onlinePaymentClaimMethod: true, onlinePaymentClaimedAt: true, notes: true, onlinePaymentItems: { select: { checkout: { select: { status: true, mercadoPagoPaymentId: true, checkoutUrl: true } } } }, settlements: { select: { amountCents: true, interestCents: true, discountCents: true } }, scheduleParticipant: { select: { playerId: true } }, sale: { select: { comanda: { select: { playerId: true } } } } }
    }) : [];
    if (selectedDebts.length !== debtIdsToSettle.length || selectedDebts.some((debt) => comandaDebtOwnerId(debt) !== comanda.playerId)) throw new ComandaOperationError("Um dos débitos selecionados não está disponível para este cliente.");
    if (selectedDebts.some(debt => Boolean(debt.onlinePaymentId || debt.onlinePaymentUrl || debt.onlinePaymentClaimMethod || debt.onlinePaymentClaimedAt) || debt.notes.includes("[MP_REVIEW:") || debt.onlinePaymentItems.some(({ checkout }) => ["PENDING", "REVIEW", "PAID"].includes(checkout.status) || (checkout.status === "FAILED" && Boolean(checkout.mercadoPagoPaymentId || checkout.checkoutUrl))))) throw new ComandaOperationError("Um dos débitos possui pagamento online emitido ou em análise. Confira e concilie a cobrança antes de quitá-lo na comanda.");
    const grossDebtBalances = selectedDebts
      .map((debt) => ({
        financialEntryId: debt.id,
        outstandingCents: getOutstandingCents(debt.amountCents, debt.settlements)
      }))
      .filter((debt) => debt.outstandingCents > 0);
    if (grossDebtBalances.length !== selectedDebts.length) throw new ComandaOperationError("Um dos débitos selecionados já foi quitado.");
    const quotedTotal = grossProductCents + grossDebtBalances.reduce((sum, debt) => sum + debt.outstandingCents, 0);
    if (parsed.data.quotedTotalCents !== undefined && parsed.data.quotedTotalCents !== quotedTotal) throw new ComandaOperationError("Os valores da comanda ou da reserva mudaram. Atualize e confira o desconto antes de finalizar.");
    const discounts = calculateComandaDiscounts({ mode: parsed.data.discountMode, discountCents: parsed.data.discountCents, itemDiscounts: parsed.data.itemDiscounts,
      items: comanda.items.map(item => ({id:item.id,amountCents:item.totalCents})),
      debts: grossDebtBalances.filter(debt => automaticDebtIds.includes(debt.financialEntryId)).map(debt => ({id:debt.financialEntryId,amountCents:debt.outstandingCents})) });
    const totalCents = grossProductCents - discounts.productDiscountCents;
    // Keep pending debt snapshots in sync with discounts; persistence happens in this same transaction.
    for (const discount of discounts.debts.filter(line => line.discountCents > 0)) {
      selectedDebts.find(debt => debt.id === discount.id)!.settlements.push({amountCents:0,interestCents:0,discountCents:discount.discountCents});
    }
    const selectedDebtBalances = grossDebtBalances.map(debt => ({...debt,outstandingCents:debt.outstandingCents-(discounts.debts.find(line=>line.id===debt.financialEntryId)?.discountCents??0)})).filter(debt=>debt.outstandingCents>0);
    const selectedDebtTotalCents = selectedDebtBalances.reduce((total, debt) => total + debt.outstandingCents, 0);
    const grandTotalCents = totalCents + selectedDebtTotalCents;
    const submittedParts = parsed.data.shares.length ? parsed.data.shares : [{ playerId: comanda.playerId, amountCents: totalCents }];
    const splitItems = discounts.items.filter(item => parsed.data.splitItemIds.includes(item.id));
    const includesBookings = parsed.data.splitIncludesBookings && parsed.data.shares.length > 0;
    const bookingLines = discounts.debts.filter(line => line.netCents > 0);
    const bookingTotal = bookingLines.reduce((sum,line) => sum + line.netCents,0);
    const fullTotal = totalCents + (includesBookings ? bookingTotal : 0);
    allocateComandaShares(submittedParts, fullTotal, 0, 0);
    if (submittedParts[0].playerId !== comanda.playerId || submittedParts.slice(1).some(part => !part.playerId || part.amountCents <= 0)) throw new ComandaOperationError("A divisão deve manter o titular e identificar cada outra pessoa.");
    const otherIds = submittedParts.slice(1).map(part => part.playerId!);
    const otherPlayers = otherIds.length ? await tx.player.findMany({ where: { arenaId: auth.arenaId, id: { in: otherIds }, active: true }, select: { id: true, name: true } }) : [];
    if (otherPlayers.length !== otherIds.length) throw new ComandaOperationError("Uma das pessoas selecionadas não está disponível nesta arena.");
    if (parsed.data.splitItemIds.length && (!parsed.data.shares.length || new Set(parsed.data.splitItemIds).size !== parsed.data.splitItemIds.length || splitItems.length !== parsed.data.splitItemIds.length)) throw new ComandaOperationError("Os itens escolhidos para divisão não estão disponíveis nesta comanda.");
    if (splitItems.length && submittedParts.slice(1).reduce((sum, part) => sum + part.amountCents, 0) > splitItems.reduce((sum, item) => sum + item.netCents, 0)) throw new ComandaOperationError("As partes dos outros clientes excedem o valor dos itens selecionados. Revise a divisão.");
    const lineShares = includesBookings && !splitItems.length
      ? allocateComandaLines(submittedParts, [{id:"PRODUCTS",amountCents:totalCents}, ...bookingLines.map(line => ({id:line.id,amountCents:line.netCents}))])
      : [{id:"PRODUCTS",parts:submittedParts.map((part,index) => ({...part,amountCents:part.amountCents-(includesBookings && index===0 ? bookingTotal : 0)}))}];
    const sharedParts = lineShares[0].parts;
    const reservationTransfers: {parentId:string;entryId:string;playerId:string;amountCents:number}[] = [];
    // Reassign only outstanding principal. Existing receipts and real discounts stay on the original charge.
    // Parent/child links keep the reservation unpaid until every assigned part is settled.
    for (const line of lineShares.slice(1)) {
      const original = selectedDebts.find(debt => debt.id === line.id)!;
      const moved = line.parts.slice(1).reduce((sum,part) => sum+part.amountCents,0);
      if (!moved) continue;
      if (moved > original.amountCents) throw new ComandaOperationError("Esta reserva possui juros que precisam ser conciliados antes da divisão.");
      await tx.financialEntry.update({where:{id:original.id},data:{amountCents:{decrement:moved}}});
      original.amountCents -= moved;
      const balance = selectedDebtBalances.find(debt => debt.financialEntryId===original.id)!;
      balance.outstandingCents -= moved;
      for (const part of line.parts.slice(1).filter(part => part.amountCents>0)) {
        const child = await tx.financialEntry.create({data:{arenaId:auth.arenaId,playerId:part.playerId!,reservationSplitParentId:original.id,type:"REVENUE",category:original.category,description:`Parte da reserva · ${original.description}`,source:"COMANDA_RESERVATION_SPLIT",externalReference:original.externalReference,dueDate:original.dueDate,competenceDate:original.competenceDate,notes:`Reserva dividida na comanda ${comanda.code}.`,amountCents:part.amountCents,status:"PENDING"}});
        reservationTransfers.push({parentId:original.id,entryId:child.id,playerId:part.playerId!,amountCents:part.amountCents});
        selectedDebts.push({...original,id:child.id,source:child.source,playerId:part.playerId,amountCents:part.amountCents,settlements:[],scheduleParticipant:null,sale:null});
        selectedDebtBalances.push({financialEntryId:child.id,outstandingCents:part.amountCents});
      }
    }
    const ownerDebtBalances = selectedDebtBalances.filter(balance => selectedDebts.find(debt => debt.id===balance.financialEntryId)?.playerId===comanda.playerId || comandaDebtOwnerId(selectedDebts.find(debt => debt.id===balance.financialEntryId)!)===comanda.playerId);
    const ownerDebtTotal = ownerDebtBalances.reduce((sum,debt) => sum+debt.outstandingCents,0);
    if (parsed.data.creditCents > sharedParts[0].amountCents + ownerDebtTotal) throw new ComandaOperationError("Os pagamentos e o saldo utilizado excedem a parte do titular da comanda.");
    const creditAppliedCents = parsed.data.creditCents;
    const productCreditCents = Math.min(creditAppliedCents, sharedParts[0].amountCents);
    const debtCreditCents = creditAppliedCents - productCreditCents;
    const excessDisposition = String(formData.get("excessDisposition") ?? "");
    if(parsed.data.payments.reduce((sum,p)=>sum+p.amountCents,0)+creditAppliedCents>grandTotalCents && !["CREDIT","CHANGE"].includes(excessDisposition)) throw new ComandaOperationError("Escolha se deseja gerar saldo para o cliente ou devolver troco.");
    const paymentPolicy = applyComandaPaymentPolicy({ totalCents: grandTotalCents, creditCents: creditAppliedCents, payments: parsed.data.payments, excessDisposition: excessDisposition === "CREDIT" || excessDisposition === "CHANGE" ? excessDisposition : undefined, preventOverpayment: operational?.preventOverpayment ?? true, requireFullPayment: operational?.requireFullPayment ?? false, allowPartial: parsed.data.allowPartial, playerId: comanda.playerId });
    await assertComandaCashRegister(tx, auth.arenaId, operational?.cashRegisterRequired ?? false, paymentTotalCents > 0);
    const creditDebtAllocation = allocatePaymentsToDebts(ownerDebtBalances, debtCreditCents ? [{ paymentMethod: "Saldo do cliente", amountCents: debtCreditCents }] : []);
    const remainingDebtBalances = selectedDebtBalances.map(debt => ({ ...debt, outstandingCents: debt.outstandingCents - creditDebtAllocation.settlements.filter(settlement => settlement.financialEntryId === debt.financialEntryId).reduce((sum, settlement) => sum + settlement.amountCents, 0) })).filter(debt => debt.outstandingCents > 0);
    if (installmentTotalCents && (paymentPolicy.excessCents || paymentPolicy.changeCents)) throw new ComandaOperationError("O parcelamento não pode ultrapassar o total da comanda.");
    const cashPayments = installmentTotalCents ? parsed.data.payments.filter(payment => !payment.installmentCount) : paymentPolicy.appliedPayments;
    // Holder claims precede other clients, including both their reservation and product portions.
    const productClaimPrefix = "comanda-product:";
    const claims = includesBookings ? sharedParts.flatMap((part,index) => [
      ...remainingDebtBalances.filter(balance => comandaDebtOwnerId(selectedDebts.find(debt => debt.id===balance.financialEntryId)!)===part.playerId),
      {financialEntryId:`${productClaimPrefix}${index}`,outstandingCents:part.amountCents-(index===0 ? productCreditCents : 0)}
    ]) : remainingDebtBalances;
    const cashDebtAllocation = allocatePaymentsToDebts(claims, cashPayments);
    const productReceipts = includesBookings ? cashDebtAllocation.settlements.filter(row => row.financialEntryId.startsWith(productClaimPrefix)).map(({bankAccountId,paymentMethod,amountCents}) => ({bankAccountId,paymentMethod,amountCents})) : [];
    const debtPaymentAllocation = {
      remainingPayments: includesBookings ? [...productReceipts,...cashDebtAllocation.remainingPayments] : cashDebtAllocation.remainingPayments,
      settlements: [...creditDebtAllocation.settlements,...cashDebtAllocation.settlements.filter(row => !row.financialEntryId.startsWith(productClaimPrefix))]
    };
    const partialDebtPaymentCents = debtPaymentAllocation.settlements.reduce((total, settlement) => total + settlement.amountCents, 0);
    const settleSelectedDebts = Boolean(selectedDebts.length) && partialDebtPaymentCents >= selectedDebtTotalCents;
    const regularProductPaymentCents = debtPaymentAllocation.remainingPayments.reduce((total, payment) => total + payment.amountCents, 0);
    if (installmentTotalCents > totalCents - productCreditCents - regularProductPaymentCents) throw new ComandaOperationError("O parcelamento cobre os itens da comanda. Para quitar reservas e outros débitos, adicione outra forma de pagamento.");
    const comandaPaymentCents = regularProductPaymentCents + installmentTotalCents;
    const remainingCents = totalCents - comandaPaymentCents - productCreditCents;
    const allocations = allocateComandaShares(sharedParts, totalCents, comandaPaymentCents, productCreditCents);
    const now = new Date();
    const sale = await tx.sale.create({
      data: {
        arenaId: auth.arenaId,
        comandaId: comanda.id,
        code: `VEN-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        customerName: comanda.label,
        paymentMethod: parsed.data.payments.length + (creditAppliedCents ? 1 : 0) === 1 ? (creditAppliedCents ? "Saldo do cliente" : parsed.data.payments[0].paymentMethod) : parsed.data.payments.length || creditAppliedCents ? "MÚLTIPLO" : "",
        status: remainingCents ? (comandaPaymentCents + productCreditCents ? "PARTIAL" : "PENDING") : "PAID",
        totalCents,
        items: { create: comanda.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPriceCents: item.unitPriceCents, totalCents: discounts.items.find(line=>line.id===item.id)!.netCents, discountCents: discounts.items.find(line=>line.id===item.id)!.discountCents, variantKey: item.variantKey, compositionLabel: item.compositionLabel, stockRecipe: item.stockRecipe ?? undefined, fiscalProfile: item.product.fiscalProfile as object })) }
      }
    });
    if (reservationTransfers.length) {
      await tx.financialEntry.updateMany({where:{arenaId:auth.arenaId,id:{in:reservationTransfers.map(part=>part.entryId)}},data:{saleId:sale.id}});
      await tx.auditEvent.create({data:{arenaId:auth.arenaId,actorId:auth.userId,actorName:auth.userName,action:"COMANDA_RESERVATION_SPLIT",entityId:comanda.id,details:{saleId:sale.id,shares:submittedParts,transfers:reservationTransfers}}});
    }
    if (discounts.discountCents) {
      for (const line of discounts.items.filter(line=>line.discountCents>0)) await tx.comandaItem.update({where:{id:line.id},data:{discountCents:line.discountCents,totalCents:line.netCents}});
      for (const line of discounts.debts.filter(line=>line.discountCents>0)) await tx.financialSettlement.create({data:{arenaId:auth.arenaId,financialEntryId:line.id,saleId:sale.id,amountCents:0,discountCents:line.discountCents,paymentMethod:"Desconto na comanda",paidAt:now,notes:`Desconto na comanda ${comanda.code}.`}});
      await tx.auditEvent.create({data:{arenaId:auth.arenaId,actorId:auth.userId,actorName:auth.userName,action:"COMANDA_DISCOUNT_APPLIED",entityId:comanda.id,details:{saleId:sale.id,mode:parsed.data.discountMode,discountCents:discounts.discountCents,items:discounts.items,debts:discounts.debts}}});
    }
    const cashReceivedCents = parsed.data.payments
      .filter((payment) => ["dinheiro", "cash"].includes(payment.paymentMethod.trim().toLocaleLowerCase("pt-BR")))
      .reduce((total, payment) => total + payment.amountCents, 0) - paymentPolicy.changeCents;
    if (cashReceivedCents > 0) {
      await recordCashSaleIfOpen(tx, { arenaId: auth.arenaId, referenceDate: cashReferenceDate(now), amountCents: cashReceivedCents, description: `Comanda ${comanda.code}`, createdByName: auth.userName });
    }
    await consumeProductStock(tx, auth.arenaId, comanda.items, `Comanda ${comanda.code}`, sale.id);

    if(paymentPolicy.changeCents) await tx.auditEvent.create({data:{arenaId:auth.arenaId,actorId:auth.userId,actorName:auth.userName,action:"COMANDA_CHANGE_RETURNED",entityId:comanda.id,details:{changeCents:paymentPolicy.changeCents}}});
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
    for (const payment of installmentPayments) {
      await tx.salePayment.create({ data: { saleId: sale.id, bankAccountId: payment.bankAccountId, paymentMethod: payment.paymentMethod, amountCents: payment.amountCents } });
      await createCardInstallmentEntries(tx, { arenaId: auth.arenaId, saleId: sale.id, playerId: comanda.playerId, counterpartyName: comanda.label, bankAccountId: payment.bankAccountId, type: "REVENUE", category: "COMANDAS", source: "COMANDA", dueDate: new Date(`${payment.firstDueDate}T12:00:00Z`), description: `Cartão da comanda ${comanda.code}`, amountCents: payment.amountCents, status: "PENDING" }, payment.installmentCount!, crypto.randomUUID(), payment.installmentRows);
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
      if (!newSettledCents && !reservationTransfers.some(part=>part.parentId===debt.id) && !discounts.debts.some(line=>line.id===debt.id && line.discountCents>0)) continue;
      const outstandingCents = getOutstandingCents(debt.amountCents, [
        ...debt.settlements,
        { amountCents: newSettledCents }
      ]);
      if (outstandingCents === 0) {
        await tx.financialEntry.update({ where: { id: debt.id }, data: { status: "PAID", paidAt: now } });
        if (debt.source === "TOURNAMENT_REGISTRATION") await syncTournamentRegistrationAfterReceipt(tx, auth.arenaId, debt.id);
      }
    }
    for (const allocation of allocations.filter(part => part.outstandingCents > 0)) {
      const payer = allocation.playerId === comanda.playerId ? comanda.label : otherPlayers.find(player => player.id === allocation.playerId)!.name;
      await tx.financialEntry.create({ data: { arenaId: auth.arenaId, saleId: sale.id, playerId: allocation.playerId, type: "REVENUE", category: "COMANDAS", description: parsed.data.shares.length ? `Parte da comanda ${comanda.code} · ${payer}` : `Conta a receber da comanda ${comanda.code}`, amountCents: allocation.outstandingCents, status: "PENDING", dueDate: now } });
    }
    if (parsed.data.shares.length) await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName, action: "COMANDA_SPLIT", entityId: comanda.id, details: { saleId: sale.id, allocations, splitItems, shares: submittedParts, reservationTransfers } } });

    if (parsed.data.fiscalDocumentType) {
      if (!parsed.data.payments.length && !creditAppliedCents) throw new ComandaOperationError("Informe um recebimento para emitir o documento fiscal da comanda.");
      await issueManualFiscalDocument(tx, {
        arenaId: auth.arenaId,
        documentType: parsed.data.fiscalDocumentType as FiscalDocumentType,
        totalCents,
        customerName: comanda.label,
        customerDocument: parsed.data.fiscalCustomerDocument,
        saleId: sale.id,
      });
    }
    await tx.comanda.update({ where: { id: comanda.id }, data: { status: "CLOSED", closedAt: now } });
    if (includesBookings && (operational?.whatsappPaidEnabled || operational?.whatsappUnpaidEnabled)) {
      const notices = submittedParts.map((part,index) => {
        const debts = selectedDebtBalances.filter(balance => comandaDebtOwnerId(selectedDebts.find(debt=>debt.id===balance.financialEntryId)!)===part.playerId);
        const debtTotal = debts.reduce((sum,debt)=>sum+debt.outstandingCents,0);
        const received = debtPaymentAllocation.settlements.filter(row=>debts.some(debt=>debt.financialEntryId===row.financialEntryId)).reduce((sum,row)=>sum+row.amountCents,0);
        return {playerId:part.playerId,amountCents:sharedParts[index].amountCents+debtTotal,outstandingCents:allocations[index].outstandingCents+debtTotal-received};
      });
      return enqueueComandaWhatsapp(tx,auth.arenaId,comanda,operational,notices);
    }
    if (operational?.whatsappPaidEnabled || operational?.whatsappUnpaidEnabled) return enqueueComandaWhatsapp(tx, auth.arenaId, comanda, operational, allocations.map((part, index) => ({ playerId: part.playerId, amountCents: part.amountCents + (index === 0 ? selectedDebtTotalCents : 0), outstandingCents: part.outstandingCents + (index === 0 ? Math.max(0, selectedDebtTotalCents - partialDebtPaymentCents) : 0) })));
  }).catch((error: unknown) => { if (error && typeof error === "object" && "fiscalValidation" in error) return { error: error instanceof Error ? error.message : "Revise a configuração fiscal." }; throw error; });
  if (whatsappIds && !Array.isArray(whatsappIds)) return whatsappIds;
  if (parsed.data.fiscalDocumentType) after(async () => { try { const { dispatchComandaFiscal } = await import("@/lib/fiscal/focus-issuance"); await dispatchComandaFiscal(auth.arenaId, parsed.data.comandaId); } catch { console.warn("Emissão fiscal permanece pendente para consulta no painel fiscal."); } });
  if (whatsappIds?.length) after(async () => { for (const id of whatsappIds) { try { await dispatchComandaWhatsapp(auth.arenaId, id); } catch { console.warn("Mensagem da comanda permanece pendente", id); } } });









}

export async function requestPortalComandaOpenAction(form: FormData) {
  const arenaSlug = z.string().trim().min(1).max(120).parse(form.get("arenaSlug"));
  const auth = await requirePublicPlayerAuth(arenaSlug);
  await withArenaTransaction(auth.arenaId, async tx => {
    await tx.$queryRaw`SELECT id FROM "Player" WHERE id = ${auth.playerId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const settings = await tx.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId }, select: { portalConsumptionEnabled: true } });
    if (settings?.portalConsumptionEnabled === false) throw new ComandaOperationError("Comandas pelo Portal estão desativadas nesta arena.");
    const player = await tx.player.findFirst({ where: { id: auth.playerId, arenaId: auth.arenaId, active: true }, select: { id: true } });
    if (!player) throw new ComandaOperationError("Cadastro indisponível. Procure a recepção.");
    const existing = await tx.comanda.findFirst({ where: { arenaId: auth.arenaId, playerId: auth.playerId, status: "OPEN" }, select: { id: true } });
    if (existing) throw new ComandaOperationError("Você já tem uma comanda aberta. Atualize a consulta.");
    await assertComandaMayOpen(tx, auth.arenaId, auth.playerId);
    const href = `/comandas?new=client&player=${encodeURIComponent(auth.playerId)}`;
    const pending = await tx.arenaNotification.findFirst({ where: { arenaId: auth.arenaId, type: "COMANDA_OPEN_REQUEST", readAt: null, href }, select: { id: true } });
    if (pending) return;
    await tx.arenaNotification.create({ data: { arenaId: auth.arenaId, type: "COMANDA_OPEN_REQUEST", title: "Abertura de comanda solicitada", message: `${auth.name} solicitou uma comanda pelo Portal.`, href } });
    await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.playerId, actorName: auth.name, action: "COMANDA_OPEN_REQUEST", entityId: auth.playerId, details: { source: "ATHLETE_PORTAL" } } });
  });

}

export async function requestPortalComandaOrderAction(formData: FormData) {
  const arenaSlug = z.string().trim().min(1).parse(formData.get("arenaSlug"));
  const auth = await requirePublicPlayerAuth(arenaSlug);
  let items: unknown;
  try { items = JSON.parse(String(formData.get("items") ?? "")); } catch { throw new ComandaOperationError("Pedido inválido."); }
  const parsed = z.object({ comandaId: z.string().min(1), orderId: z.string().uuid(), items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(999), choices: ingredientChoicesSchema.optional() })).min(1).max(50) }).safeParse({ comandaId: formData.get("comandaId"), orderId: formData.get("orderId"), items });
  if (!parsed.success) throw new ComandaOperationError("Revise os produtos e quantidades do pedido.");
  await withArenaTransaction(auth.arenaId, tx => submitPortalOrder(tx, { ...parsed.data, arenaId: auth.arenaId, playerId: auth.playerId }));

}

export async function confirmPortalComandaRequestAction(formData: FormData) {
  const auth = await requirePermission("pos:command:items");
  const requestId = z.string().min(1).parse(formData.get("requestId"));
  await withArenaTransaction(auth.arenaId, tx => confirmPortalOrderItem(tx, auth.arenaId, requestId));

}
