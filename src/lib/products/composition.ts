import { ProductOperationError } from "@/lib/backend/product-operation-error";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { readStockAggregates } from "./stock-recipe";
import type { IngredientChoices, ProductComposition } from "./composition-types";
export { stockChoicesSchema, ingredientChoicesSchema, readStockChoices, compositionIds } from "./composition-schema";
import { stockChoicesSchema, ingredientChoicesSchema, readStockChoices, compositionIds } from "./composition-schema";
export async function resolveComposition(tx: Prisma.TransactionClient, arenaId: string, product: { stockAggregates?: unknown; stockChoices?: unknown }, choices: IngredientChoices = {}) {
 const groups = readStockChoices(product.stockChoices); ingredientChoicesSchema.parse(choices);
 if (Object.keys(choices).some(id => !groups.some(group => group.id === id))) throw new ProductOperationError("A composição mudou. Revise as opções do produto.");
 const recipe = [...readStockAggregates(product.stockAggregates)];
 for (const group of groups) { const selected = group.options.find(option => option.productId === choices[group.id]); if (!selected) throw new ProductOperationError(`Escolha uma opção de ${group.label}.`); recipe.push(selected); }
 // Combine ingredients that are used by more than one group.
 const totals = new Map<string, number>(); for (const row of recipe) totals.set(row.productId, (totals.get(row.productId) ?? 0) + row.quantity);
 const resolved = [...totals].sort(([a],[b]) => a.localeCompare(b)).map(([productId, quantity]) => ({ productId, quantity }));
 const products = resolved.length ? await tx.product.findMany({ where: { arenaId, active: true, isService: false, id: { in: resolved.map(row => row.productId) } }, select: { id: true, name: true } }) : [];
 if (products.length !== resolved.length) throw new ProductOperationError("Um ingrediente não está disponível nesta arena.");
 return { stockRecipe: resolved, compositionLabel: resolved.map(row => `${row.quantity}× ${products.find(product => product.id === row.productId)!.name}`).join(" · "), variantKey: resolved.length ? createHash("sha256").update(JSON.stringify(resolved)).digest("hex").slice(0,40) : "" };
}
export async function decorateCompositions<T extends { id: string; stockAggregates?: unknown; stockChoices?: unknown }>(tx: Prisma.TransactionClient, arenaId: string, products: T[]): Promise<(T & { composition: ProductComposition })[]> {
 const ids = [...new Set(products.flatMap(compositionIds))];
 const ingredients = ids.length ? await tx.product.findMany({ where: { arenaId, isService: false, id: { in: ids } }, select: { id: true, name: true, stockQuantity: true, active: true } }) : [];
 const display = (row: { productId: string; quantity: number }) => { const product = ingredients.find(product => product.id === row.productId); return { ...row, name: product?.name ?? "Ingrediente indisponível", available: Boolean(product?.active && product.stockQuantity >= row.quantity) }; };
 return products.map(product => ({ ...product, composition: { fixed: readStockAggregates(product.stockAggregates).map(display), groups: readStockChoices(product.stockChoices).map(group => ({ ...group, options: group.options.map(display) })) } }));
}
