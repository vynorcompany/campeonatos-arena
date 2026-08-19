"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const comandaSchema = z.object({
  type: z.enum(["CLIENT", "AVULSA"]),
  playerId: z.string().trim().optional(),
  label: z.string().trim().max(80).optional()
});

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
  paymentMethod: z.string().trim().min(1).max(80),
  amountCents: z.coerce.number().int().positive()
})).max(8);

const finishComandaSchema = z.object({
  comandaId: z.string().min(1),
  payments: paymentsSchema
});

function formatComandaCode() {
  return `CMD-${Date.now().toString(36).toUpperCase()}`;
}

export async function createComandaAction(formData: FormData) {
  const auth = await requireModuleEdit("pos");
  const parsed = comandaSchema.safeParse({
    type: formData.get("type"),
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

  await prisma.$transaction(async (tx) => {
    const productCount = await tx.product.count({ where: { arenaId: auth.arenaId, active: true } });
    if (!productCount) {
      await tx.product.create({ data: { arenaId: auth.arenaId, name: "Água mineral 500 ml", sku: "DEMO-AGUA-500", priceCents: 500, stockQuantity: 100, minStock: 10 } });
    }
    await tx.comanda.create({
      data: {
        arenaId: auth.arenaId,
        playerId: player?.id,
        code: formatComandaCode(),
        label,
        type: parsed.data.type
      }
    });
  });

  revalidatePath("/comandas");
}

export async function addComandaProductAction(formData: FormData) {
  const auth = await requireModuleEdit("pos");
  const parsed = comandaProductSchema.safeParse({ comandaId: formData.get("comandaId"), productId: formData.get("productId"), quantity: formData.get("quantity") || 1 });
  if (!parsed.success) throw new Error("Produto inválido.");

  await prisma.$transaction(async (tx) => {
    const [comanda, product] = await Promise.all([
      tx.comanda.findFirst({ where: { id: parsed.data.comandaId, arenaId: auth.arenaId, status: "OPEN" }, select: { id: true } }),
      tx.product.findFirst({ where: { id: parsed.data.productId, arenaId: auth.arenaId, active: true }, select: { id: true, priceCents: true, stockQuantity: true } })
    ]);
    if (!comanda) throw new Error("Comanda não está disponível.");
    if (!product) throw new Error("Produto não encontrado.");
    const current = await tx.comandaItem.findUnique({ where: { comandaId_productId: { comandaId: comanda.id, productId: product.id } } });
    const nextQuantity = (current?.quantity ?? 0) + parsed.data.quantity;
    if (product.stockQuantity < nextQuantity) throw new Error("Estoque insuficiente para este produto.");
    await tx.comandaItem.upsert({
      where: { comandaId_productId: { comandaId: comanda.id, productId: product.id } },
      update: { quantity: nextQuantity, unitPriceCents: product.priceCents, totalCents: product.priceCents * nextQuantity },
      create: { comandaId: comanda.id, productId: product.id, quantity: parsed.data.quantity, unitPriceCents: product.priceCents, totalCents: product.priceCents * parsed.data.quantity }
    });
  });
  revalidatePath("/comandas");
}

export async function updateComandaItemQuantityAction(formData: FormData) {
  const auth = await requireModuleEdit("pos");
  const parsed = itemQuantitySchema.safeParse({ itemId: formData.get("itemId"), delta: formData.get("delta") });
  if (!parsed.success) throw new Error("Ajuste inválido.");

  await prisma.$transaction(async (tx) => {
    const item = await tx.comandaItem.findFirst({ where: { id: parsed.data.itemId, comanda: { arenaId: auth.arenaId, status: "OPEN" } }, include: { product: { select: { stockQuantity: true } } } });
    if (!item) throw new Error("Item não encontrado.");
    const nextQuantity = item.quantity + parsed.data.delta;
    if (nextQuantity <= 0) { await tx.comandaItem.delete({ where: { id: item.id } }); return; }
    if (item.product.stockQuantity < nextQuantity) throw new Error("Estoque insuficiente para este produto.");
    await tx.comandaItem.update({ where: { id: item.id }, data: { quantity: nextQuantity, totalCents: item.unitPriceCents * nextQuantity } });
  });
  revalidatePath("/comandas");
}

export async function finishComandaAction(formData: FormData) {
  const auth = await requireModuleEdit("pos");
  let payments: unknown = [];
  const rawPayments = formData.get("payments");
  if (typeof rawPayments === "string" && rawPayments.trim()) {
    try { payments = JSON.parse(rawPayments); } catch { throw new Error("Pagamentos inválidos."); }
  }
  const parsed = finishComandaSchema.safeParse({ comandaId: formData.get("comandaId"), payments });
  if (!parsed.success) throw new Error("Comanda inválida.");

  await prisma.$transaction(async (tx) => {
    const comanda = await tx.comanda.findFirst({ where: { id: parsed.data.comandaId, arenaId: auth.arenaId, status: "OPEN" }, include: { items: { include: { product: true } } } });
    if (!comanda) throw new Error("Comanda não está disponível.");
    if (!comanda.items.length) throw new Error("Insira ao menos um produto antes de finalizar.");
    const totalCents = comanda.items.reduce((total, item) => total + item.totalCents, 0);
    const paymentTotalCents = parsed.data.payments.reduce((total, payment) => total + payment.amountCents, 0);
    if (paymentTotalCents > totalCents) throw new Error("Os pagamentos não podem ultrapassar o total da comanda.");
    const remainingCents = totalCents - paymentTotalCents;
    const now = new Date();
    const sale = await tx.sale.create({
      data: {
        arenaId: auth.arenaId,
        comandaId: comanda.id,
        code: `VEN-${Date.now().toString(36).toUpperCase()}`,
        customerName: comanda.label,
        paymentMethod: parsed.data.payments.length === 1 ? parsed.data.payments[0].paymentMethod : parsed.data.payments.length ? "MÚLTIPLO" : "",
        status: remainingCents ? (paymentTotalCents ? "PARTIAL" : "PENDING") : "PAID",
        totalCents,
        items: { create: comanda.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPriceCents: item.unitPriceCents, totalCents: item.totalCents })) }
      }
    });
    for (const item of comanda.items) {
      if (item.product.stockQuantity < item.quantity) throw new Error(`Estoque insuficiente para ${item.product.name}.`);
      await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { decrement: item.quantity } } });
      await tx.stockMovement.create({ data: { arenaId: auth.arenaId, productId: item.productId, type: "OUT", quantity: item.quantity, reason: `Comanda ${comanda.code}` } });
    }
    for (const payment of parsed.data.payments) {
      await tx.salePayment.create({ data: { saleId: sale.id, paymentMethod: payment.paymentMethod, amountCents: payment.amountCents } });
      await tx.financialEntry.create({ data: { arenaId: auth.arenaId, saleId: sale.id, type: "INCOME", category: "COMANDAS", description: `Recebimento da comanda ${comanda.code}`, amountCents: payment.amountCents, paymentMethod: payment.paymentMethod, status: "PAID", paidAt: now } });
    }
    if (remainingCents) {
      await tx.financialEntry.create({ data: { arenaId: auth.arenaId, saleId: sale.id, type: "INCOME", category: "COMANDAS", description: `Conta a receber da comanda ${comanda.code}`, amountCents: remainingCents, status: "PENDING", dueDate: now } });
    }
    await tx.comanda.update({ where: { id: comanda.id }, data: { status: "CLOSED", closedAt: now } });
  });
  revalidatePath("/comandas");
  revalidatePath("/financeiro/lancamentos");
}
