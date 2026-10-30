import { z } from "zod";
export const stockAggregatesSchema = z.array(z.object({ productId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(999) }).strict()).max(20).refine(rows => new Set(rows.map(row => row.productId)).size === rows.length, "Não repita produtos agregados.");
export type StockAggregate = z.infer<typeof stockAggregatesSchema>[number];
export function readStockAggregates(value: unknown): StockAggregate[] {
  return stockAggregatesSchema.parse(value ?? []);
}


// A resolved recipe combines repeated ingredients from fixed rows and choice groups.
// Its quantities/length can therefore exceed a single configuration row's limits.
const resolvedRecipeSchema = z.array(z.object({ productId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(2147483647) }).strict()).max(120).refine(rows => new Set(rows.map(row => row.productId)).size === rows.length);
export const readResolvedStockRecipe = (value: unknown): StockAggregate[] => resolvedRecipeSchema.parse(value ?? []);
