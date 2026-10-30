import { resolveComposition, ingredientChoicesSchema } from "@/lib/products/composition";
import { readResolvedStockRecipe } from "@/lib/products/stock-recipe";
import { compositionCartKey, type IngredientChoices } from "@/lib/products/composition-types";
import { assertAggregateAvailability } from "@/lib/products/stock-aggregates";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { servicePriceCents } from "@/lib/products/service-pricing";

type Item = { productId: string; quantity: number; choices?: IngredientChoices };
const key = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 40);

export async function submitPortalOrder(tx: Prisma.TransactionClient, input: { arenaId: string; playerId: string; comandaId: string; orderId: string; items: Item[] }) {
  const { arenaId, playerId, comandaId, orderId, items } = input;
  if (!items.length || items.length > 50 || new Set(items.map(item => compositionCartKey(item.productId,item.choices))).size !== items.length || items.some(item => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999)) throw new Error("Revise os produtos e quantidades do pedido.");
  await tx.$queryRaw`SELECT id FROM "Comanda" WHERE id = ${comandaId} AND "arenaId" = ${arenaId} AND "playerId" = ${playerId} FOR UPDATE`;
  const comanda = await tx.comanda.findFirst({ where: { id: comandaId, arenaId, playerId }, select: { id: true, code: true, status: true } });
  if (!comanda) throw new Error("Esta comanda não está disponível.");
  const rows = items.map(item => ({ productId:item.productId,quantity:item.quantity,ingredientChoices:ingredientChoicesSchema.parse(item.choices ?? {}), id: `portal-item-${key(`${arenaId}:${comandaId}:${orderId}:${compositionCartKey(item.productId,item.choices)}`)}`, comandaId }));
  const previous = await tx.comandaRequest.findMany({ where: { id: { in: rows.map(row => row.id) }, comandaId } });
  if (previous.length) {
    if (previous.length !== rows.length || rows.some(row => !previous.some(saved => saved.id === row.id && saved.productId === row.productId && saved.quantity === row.quantity))) throw new Error("Este pedido já foi enviado com outros itens. Atualize a comanda.");
    return { replayed: true };
  }
  if (comanda.status !== "OPEN") throw new Error("Esta comanda não está mais aberta.");
  const settings = await tx.arenaOperationalSettings.findUnique({ where: { arenaId }, select: { portalConsumptionEnabled: true } });
  if (settings?.portalConsumptionEnabled === false) throw new Error("A arena desativou comandas pelo Portal. Procure a recepção.");
  const products = await tx.product.findMany({ where: { arenaId, id: { in: items.map(item => item.productId) }, active: true, stockQuantity: { gt: 0 } }, select: { id: true, name: true, stockQuantity: true, stockAggregates: true, stockChoices: true } });
  if (items.some(item => !products.some(product => product.id === item.productId && product.stockQuantity >= item.quantity))) throw new Error("Um dos produtos está indisponível na quantidade solicitada. Revise seu pedido.");
  const resolved = await Promise.all(rows.map(async row => ({ ...row, ...await resolveComposition(tx, arenaId, products.find(product => product.id === row.productId)!, row.ingredientChoices) })));
  const parentTotals = new Map<string, number>(); for (const row of rows) parentTotals.set(row.productId,(parentTotals.get(row.productId) ?? 0)+row.quantity);
  if ([...parentTotals].some(([id,quantity]) => products.find(product => product.id === id)!.stockQuantity < quantity)) throw new Error("Produto indisponível na quantidade solicitada.");
  await assertAggregateAvailability(tx, arenaId, resolved);
  const player = await tx.player.findFirst({ where: { id: playerId, arenaId }, select: { name: true } });
  await tx.comandaRequest.createMany({ data: resolved });
  await tx.arenaNotification.create({ data: { id: `portal-order-${key(`${arenaId}:${comandaId}:${orderId}`)}`, arenaId, type: "COMANDA_REQUEST", title: `Pedido na comanda ${comanda.code}`, message: `${player?.name ?? "Cliente"}: ${items.map(item => `${item.quantity}× ${products.find(product => product.id === item.productId)!.name}`).join("; ")}.`, href: `/comandas?ids=${encodeURIComponent(comandaId)}` } });
  return { replayed: false };
}

export async function appendComandaProduct(tx: Prisma.TransactionClient, arenaId: string, input: { comandaId: string; productId: string; quantity: number; durationMinutes: number; choices?: IngredientChoices; frozen?: { stockRecipe: unknown; variantKey: string; compositionLabel: string } }) {
  await tx.$queryRaw`SELECT id FROM "Comanda" WHERE id = ${input.comandaId} AND "arenaId" = ${arenaId} FOR UPDATE`;
  const [comanda, product] = await Promise.all([
    tx.comanda.findFirst({ where: { id: input.comandaId, arenaId, status: "OPEN" }, select: { id: true } }),
    tx.product.findFirst({ where: { id: input.productId, arenaId, active: true, OR: [{ isService: false }, { showOnComandas: true }] }, select: { id: true, priceCents: true, isService: true, serviceHourly: true, stockAggregates: true, stockChoices: true } }),
  ]);
  if (!comanda) throw new Error("Comanda não está disponível.");
  if (!product) throw new Error("Produto não encontrado.");
  const composition = input.frozen ? { ...input.frozen, stockRecipe: readResolvedStockRecipe(input.frozen.stockRecipe) } : await resolveComposition(tx, arenaId, product, input.choices);
  if (composition.stockRecipe.length) await assertAggregateAvailability(tx, arenaId, [{productId:product.id,quantity:input.quantity,stockRecipe:composition.stockRecipe}]);
  const unique = { comandaId: comanda.id, productId: product.id, variantKey: composition.variantKey };
  const current = await tx.comandaItem.findUnique({ where: { comandaId_productId_variantKey: unique } });
  if (current && product.isService && product.serviceHourly && current.durationMinutes !== input.durationMinutes) throw new Error("Este serviço já está lançado com outra duração. Remova o item antes de alterar o período.");
  const unitPriceCents = current?.unitPriceCents ?? servicePriceCents(product.priceCents, product.isService && product.serviceHourly, input.durationMinutes);
  const nextQuantity = (current?.quantity ?? 0) + input.quantity;
  if (nextQuantity > 999 || unitPriceCents * nextQuantity > 2_147_483_647) throw new Error("Quantidade ou valor acima do limite permitido.");
  await tx.comandaItem.upsert({ where: { comandaId_productId_variantKey: unique }, update: { quantity: nextQuantity, totalCents: unitPriceCents * nextQuantity }, create: { ...composition, comandaId: comanda.id, productId: product.id, quantity: input.quantity, durationMinutes: product.isService && product.serviceHourly ? input.durationMinutes : 60, unitPriceCents, totalCents: unitPriceCents * input.quantity } });
}

export async function confirmPortalOrderItem(tx: Prisma.TransactionClient, arenaId: string, requestId: string) {
  await tx.$queryRaw`SELECT c.id FROM "Comanda" c JOIN "ComandaRequest" r ON r."comandaId" = c.id WHERE r.id = ${requestId} AND c."arenaId" = ${arenaId} FOR UPDATE OF c`;
  const request = await tx.comandaRequest.findFirst({ where: { id: requestId, comanda: { arenaId } }, select: { id: true, status: true, comandaId: true, productId: true, quantity: true, stockRecipe: true, variantKey: true, compositionLabel: true } });
  if (!request) throw new Error("Pedido não encontrado nesta arena.");
  if (request.status === "CONFIRMED") return { alreadyConfirmed: true };
  if (request.status !== "PENDING") throw new Error("Este pedido não está mais pendente.");
  await appendComandaProduct(tx, arenaId, { ...request, durationMinutes: 60, ...(request.stockRecipe !== null ? {frozen: {stockRecipe:request.stockRecipe,variantKey:request.variantKey,compositionLabel:request.compositionLabel}} : {}) });
  await tx.comandaRequest.update({ where: { id: request.id }, data: { status: "CONFIRMED" } });
  return { alreadyConfirmed: false };
}
