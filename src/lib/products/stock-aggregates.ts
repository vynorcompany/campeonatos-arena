import { Prisma } from "@prisma/client";


export { stockAggregatesSchema, readStockAggregates } from "./stock-recipe";
import { readStockAggregates, readResolvedStockRecipe } from "./stock-recipe";
import { readStockChoices, compositionIds } from "./composition";

/** Serialize recipe edits within a tenant, so concurrent edits cannot create nested recipes. */
export async function saveStockAggregates(tx: Prisma.TransactionClient, arenaId: string, productId: string, value: unknown, choiceValue?: unknown) {
  const rows = readStockAggregates(value);
  const groups = choiceValue === undefined ? undefined : readStockChoices(choiceValue);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`stock-recipe:${arenaId}`}, 0))`;
  const products = await tx.product.findMany({ where: { arenaId, isService: false }, select: { id: true, active: true, stockAggregates: true, stockChoices: true } });
  const parent = products.find(product => product.id === productId);
  if (!parent) throw new Error("Produto não encontrado.");
  const ids = [...rows.map(row => row.productId), ...(groups ?? readStockChoices(parent.stockChoices)).flatMap(group => group.options.map(row => row.productId))];
  if (ids.some(id => id === productId)) throw new Error("O produto não pode ser agregado de si mesmo.");
  if (ids.length && products.some(product => compositionIds(product).includes(productId))) throw new Error("Este produto já é agregado de outro. Use produtos simples na composição.");
  if (ids.some(id => !products.some(product => product.id === id && product.active && compositionIds(product).length === 0))) throw new Error("Selecione produtos ativos sem agregados, desta arena.");
  await tx.product.update({ where: { id: productId }, data: { stockAggregates: rows, ...(groups ? { stockChoices: groups } : {}) } });
}

type StockDemandItem = { productId: string; quantity: number; stockRecipe?: unknown };
const recipeFor = (product: { stockAggregates?: unknown; stockChoices?: unknown }, item: StockDemandItem) => {
 if (item.stockRecipe != null) return readResolvedStockRecipe(item.stockRecipe);
 if (readStockChoices(product.stockChoices).length) throw new Error("Escolha a composição do produto antes de lançar.");
 return readStockAggregates(product.stockAggregates);
};

/** Expands extra consumption only; the sold product keeps its normal inventory unit. */
export function stockDemand(products: { id: string; isService?: boolean; stockAggregates?: unknown; stockChoices?: unknown }[], items: StockDemandItem[]) {
  const demand = new Map<string, number>();
  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error("Quantidade inválida.");
    const product = products.find(product => product.id === item.productId);
    if (!product) throw new Error("Produto indisponível.");
    if (product.isService) continue;
    for (const row of [{ productId: product.id, quantity: 1 }, ...recipeFor(product, item)]) {
      const quantity = (demand.get(row.productId) ?? 0) + row.quantity * item.quantity;
      if (!Number.isSafeInteger(quantity) || quantity > 2147483647) throw new Error("Quantidade de estoque acima do limite.");
      demand.set(row.productId, quantity);
    }
  }
  return demand;
}

export async function consumeProductStock(tx: Prisma.TransactionClient, arenaId: string, items: StockDemandItem[], reason: string, saleId?: string) {
  const summarize = (rows: { productId: string; quantity: number }[]) => { const quantities = new Map<string,number>(); for (const row of rows) quantities.set(row.productId,(quantities.get(row.productId) ?? 0)+row.quantity); return [...quantities].sort(([a],[b]) => a.localeCompare(b)).map(([productId,quantity]) => ({productId,quantity})); };
  const saleItems = summarize(items);
  if (saleId) {
    await tx.$queryRaw`SELECT id FROM "Sale" WHERE id = ${saleId} AND "arenaId" = ${arenaId} FOR UPDATE`;
    const sale = await tx.sale.findFirst({ where: { id: saleId, arenaId }, select: { stockConsumption: true, items: { select: { productId: true, quantity: true } } } });
    if (!sale) throw new Error("Venda não encontrada nesta arena.");
    const persistedItems = summarize(sale.items);
    // Direct POS inserts its sale items before invoking this function too.
    if (JSON.stringify(persistedItems) !== JSON.stringify(saleItems)) throw new Error("A composição deve corresponder aos itens da venda.");
    if (sale.stockConsumption !== null) return;
  }
  const products = await tx.product.findMany({ where: { arenaId, id: { in: items.map(item => item.productId) } }, select: { id: true, name: true, isService: true, stockAggregates: true, stockChoices: true } });
  const demand = stockDemand(products, items);
  const ids = [...demand.keys()].sort();
  const movements: { productId: string; name: string; sku: string; quantity: number; unitCostCents: number; movementId: string; sources: { soldProductId: string; soldProductName: string; quantity: number; ingredient: boolean }[] }[] = [];
  if (ids.length) {
    // Ordered locks serialize overlapping recipes and prevent lost updates.
    await tx.$queryRaw`SELECT id FROM "Product" WHERE "arenaId" = ${arenaId} AND id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
    const available = await tx.product.findMany({ where: { arenaId, id: { in: ids } }, select: { id: true, name: true, sku: true, costCents: true, active: true, stockQuantity: true } });
    const aggregateIds = new Set(items.flatMap(item => recipeFor(products.find(product => product.id === item.productId)!, item).map(row => row.productId)));
    for (const [productId, quantity] of demand) {
      const product = available.find(product => product.id === productId);
      if (!product) throw new Error("Produto agregado não encontrado nesta arena.");
      // Keep existing negative-stock policy for normal products. Ingredients require availability.
      if (aggregateIds.has(productId) && (!product.active || product.stockQuantity < quantity)) throw new Error(`Estoque insuficiente do agregado ${product.name}.`);
      await tx.product.update({ where: { id: productId }, data: { stockQuantity: { decrement: quantity } } });
      const movement = await tx.stockMovement.create({ data: { arenaId, productId, type: "OUT", quantity, reason: aggregateIds.has(productId) ? `${reason} · agregado` : reason } });
      const sources = items.flatMap(item => {
        const sold = products.find(row => row.id === item.productId)!;
        if (sold.isService) return [];
        const multiplier = sold.id === productId ? 1 : recipeFor(sold, item).find(row => row.productId === productId)?.quantity ?? 0;
        return multiplier ? [{ soldProductId: sold.id, soldProductName: sold.name, quantity: multiplier * item.quantity, ingredient: sold.id !== productId }] : [];
      });
      movements.push({ productId, name: product.name, sku: product.sku, quantity, unitCostCents: product.costCents, movementId: movement.id, sources });
    }
  }
  if (saleId) await tx.sale.update({ where: { id: saleId }, data: { stockConsumption: { version: 1, saleItems, movements } } });
}

export async function assertAggregateAvailability(tx: Prisma.TransactionClient, arenaId: string, items: StockDemandItem[]) {
  const products = await tx.product.findMany({ where: { arenaId, id: { in: items.map(item => item.productId) } }, select: { id: true, isService: true, stockAggregates: true, stockChoices: true } });
  const demand = stockDemand(products, items);
  const aggregateIds = [...new Set(items.flatMap(item => recipeFor(products.find(product => product.id === item.productId)!, item).map(row => row.productId)))];
  if (!aggregateIds.length) return;
  const available = await tx.product.findMany({ where: { arenaId, active: true, isService: false, id: { in: aggregateIds } }, select: { id: true, stockQuantity: true } });
  if (aggregateIds.some(id => !available.some(product => product.id === id && product.stockQuantity >= demand.get(id)!))) throw new Error("Um produto agregado está indisponível na quantidade solicitada.");
}

export async function catalogAggregateAvailability<T extends { id: string; stockQuantity: number; stockAggregates?: unknown; stockChoices?: unknown }>(tx: Prisma.TransactionClient, arenaId: string, products: T[]) {
  const ids = [...new Set(products.flatMap(compositionIds))];
  if (!ids.length) return products;
  const components = await tx.product.findMany({ where: { arenaId, active: true, isService: false, id: { in: ids } }, select: { id: true, stockQuantity: true } });
  const capacity = (row: { productId: string; quantity: number }) => Math.max(0,Math.floor((components.find(component => component.id === row.productId)?.stockQuantity ?? 0)/row.quantity));
  return products.map(product => ({ ...product, stockQuantity: Math.min(product.stockQuantity, ...readStockAggregates(product.stockAggregates).map(capacity), ...readStockChoices(product.stockChoices).map(group => group.options.reduce((sum,row) => sum+capacity(row),0))) })).filter(product => product.stockQuantity > 0);
}
