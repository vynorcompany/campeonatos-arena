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
  productId: z.string().min(1)
});

const itemQuantitySchema = z.object({
  itemId: z.string().min(1),
  delta: z.coerce.number().int().refine((value) => value === 1 || value === -1, "Ajuste inválido.")
});

const finishComandaSchema = z.object({ comandaId: z.string().min(1) });

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
  const parsed = comandaProductSchema.safeParse({ comandaId: formData.get("comandaId"), productId: formData.get("productId") });
  if (!parsed.success) throw new Error("Produto inválido.");

  await prisma.$transaction(async (tx) => {
    const [comanda, product] = await Promise.all([
      tx.comanda.findFirst({ where: { id: parsed.data.comandaId, arenaId: auth.arenaId, status: "OPEN" }, select: { id: true } }),
      tx.product.findFirst({ where: { id: parsed.data.productId, arenaId: auth.arenaId, active: true }, select: { id: true, priceCents: true, stockQuantity: true } })
    ]);
    if (!comanda) throw new Error("Comanda não está disponível.");
    if (!product) throw new Error("Produto não encontrado.");
    const current = await tx.comandaItem.findUnique({ where: { comandaId_productId: { comandaId: comanda.id, productId: product.id } } });
    const nextQuantity = (current?.quantity ?? 0) + 1;
    if (product.stockQuantity < nextQuantity) throw new Error("Estoque insuficiente para este produto.");
    await tx.comandaItem.upsert({
      where: { comandaId_productId: { comandaId: comanda.id, productId: product.id } },
      update: { quantity: nextQuantity, unitPriceCents: product.priceCents, totalCents: product.priceCents * nextQuantity },
      create: { comandaId: comanda.id, productId: product.id, quantity: 1, unitPriceCents: product.priceCents, totalCents: product.priceCents }
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
  const parsed = finishComandaSchema.safeParse({ comandaId: formData.get("comandaId") });
  if (!parsed.success) throw new Error("Comanda inválida.");

  await prisma.$transaction(async (tx) => {
    const comanda = await tx.comanda.findFirst({ where: { id: parsed.data.comandaId, arenaId: auth.arenaId, status: "OPEN" }, include: { items: { include: { product: true } } } });
    if (!comanda) throw new Error("Comanda não está disponível.");
    if (!comanda.items.length) throw new Error("Insira ao menos um produto antes de finalizar.");
    for (const item of comanda.items) {
      if (item.product.stockQuantity < item.quantity) throw new Error(`Estoque insuficiente para ${item.product.name}.`);
      await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { decrement: item.quantity } } });
      await tx.stockMovement.create({ data: { arenaId: auth.arenaId, productId: item.productId, type: "OUT", quantity: item.quantity, reason: `Comanda ${comanda.code}` } });
    }
    await tx.comanda.update({ where: { id: comanda.id }, data: { status: "CLOSED", closedAt: new Date() } });
  });
  revalidatePath("/comandas");
}
