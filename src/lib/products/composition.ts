import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { readStockAggregates } from "./stock-recipe";
import type { IngredientChoices, ProductComposition } from "./composition-types";
const option = z.object({ productId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(999) }).strict();
export const stockChoicesSchema = z.array(z.object({ id: z.string().min(1).max(100), label: z.string().trim().min(1).max(60), options: z.array(option).min(2).max(10).refine(rows => new Set(rows.map(row => row.productId)).size === rows.length, "Não repita alternativas no mesmo grupo.") }).strict()).max(10).refine(groups => new Set(groups.map(group => group.id)).size === groups.length);
export const ingredientChoicesSchema = z.record(z.string().max(100), z.string().min(1).max(100)).refine(value => Object.keys(value).length <= 10);
export const readStockChoices = (value: unknown) => stockChoicesSchema.parse(value ?? []);
export const compositionIds = (product: { stockAggregates?: unknown; stockChoices?: unknown }) => [...readStockAggregates(product.stockAggregates).map(row => row.productId), ...readStockChoices(product.stockChoices).flatMap(group => group.options.map(row => row.productId))];
export async function resolveComposition(tx: Prisma.TransactionClient, arenaId: string, product: { stockAggregates?: unknown; stockChoices?: unknown }, choices: IngredientChoices = {}) {
 const groups = readStockChoices(product.stockChoices); ingredientChoicesSchema.parse(choices);
 if (Object.keys(choices).some(id => !groups.some(group => group.id === id))) throw new Error("A composição mudou. Revise as opções do produto.");
 const recipe = [...readStockAggregates(product.stockAggregates)];
 for (const group of groups) { const selected = group.options.find(option => option.productId === choices[group.id]); if (!selected) throw new Error(`Escolha uma opção de ${group.label}.`); recipe.push(selected); }
 // Combine ingredients that are used by more than one group.
 const totals = new Map<string, number>(); for (const row of recipe) totals.set(row.productId, (totals.get(row.productId) ?? 0) + row.quantity);
 const resolved = [...totals].sort(([a],[b]) => a.localeCompare(b)).map(([productId, quantity]) => ({ productId, quantity }));
 const products = resolved.length ? await tx.product.findMany({ where: { arenaId, active: true, isService: false, id: { in: resolved.map(row => row.productId) } }, select: { id: true, name: true } }) : [];
 if (products.length !== resolved.length) throw new Error("Um ingrediente não está disponível nesta arena.");
 return { stockRecipe: resolved, compositionLabel: resolved.map(row => `${row.quantity}× ${products.find(product => product.id === row.productId)!.name}`).join(" · "), variantKey: resolved.length ? createHash("sha256").update(JSON.stringify(resolved)).digest("hex").slice(0,40) : "" };
}
export async function decorateCompositions<T extends { id: string; stockAggregates?: unknown; stockChoices?: unknown }>(tx: Prisma.TransactionClient, arenaId: string, products: T[]): Promise<(T & { composition: ProductComposition })[]> {
 const ids = [...new Set(products.flatMap(compositionIds))];
 const ingredients = ids.length ? await tx.product.findMany({ where: { arenaId, isService: false, id: { in: ids } }, select: { id: true, name: true, stockQuantity: true, active: true } }) : [];
 const display = (row: { productId: string; quantity: number }) => { const product = ingredients.find(product => product.id === row.productId); return { ...row, name: product?.name ?? "Ingrediente indisponível", available: Boolean(product?.active && product.stockQuantity >= row.quantity) }; };
 return products.map(product => ({ ...product, composition: { fixed: readStockAggregates(product.stockAggregates).map(display), groups: readStockChoices(product.stockChoices).map(group => ({ ...group, options: group.options.map(display) })) } }));
}
