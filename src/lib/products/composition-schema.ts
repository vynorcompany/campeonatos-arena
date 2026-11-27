import { z } from "zod";
import { readStockAggregates } from "./stock-recipe";
const option = z.object({ productId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(999) }).strict();
export const stockChoicesSchema = z.array(z.object({ id: z.string().min(1).max(100), label: z.string().trim().min(1).max(60), options: z.array(option).min(2).max(10).refine(rows => new Set(rows.map(row => row.productId)).size === rows.length, "Não repita alternativas no mesmo grupo.") }).strict()).max(10).refine(groups => new Set(groups.map(group => group.id)).size === groups.length);
export const ingredientChoicesSchema = z.record(z.string().max(100), z.string().min(1).max(100)).refine(value => Object.keys(value).length <= 10);
export const readStockChoices = (value: unknown) => stockChoicesSchema.parse(value ?? []);
export const compositionIds = (product: { stockAggregates?: unknown; stockChoices?: unknown }) => [...readStockAggregates(product.stockAggregates).map(row => row.productId), ...readStockChoices(product.stockChoices).flatMap(group => group.options.map(row => row.productId))];
