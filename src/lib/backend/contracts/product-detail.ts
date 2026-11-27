import { z } from 'zod';
import { stockAggregatesSchema } from '@/lib/products/stock-recipe';
import { stockChoicesSchema } from '@/lib/products/composition-schema';
import { productFiscalProfileSchema } from '@/lib/fiscal/product-profile';
const named = z.object({ id: z.string(), name: z.string() }).strict();
export const productDetailDataSchema = z.object({
  product: named.extend({ sku: z.string(), notes: z.string(), priceCents: z.number().int(), costCents: z.number().int(), stockQuantity: z.number().int(), minStock: z.number().int(), categoryId: z.string().nullable(), isService: z.boolean(), updatedAt: z.iso.datetime(), stockAggregates: stockAggregatesSchema, stockChoices: stockChoicesSchema, fiscalProfile: productFiscalProfileSchema, stockMovements: z.array(z.object({ id: z.string(), type: z.string(), quantity: z.number().int(), reason: z.string(), createdAt: z.iso.datetime() }).strict()) }).strict(),
  categories: z.array(named), aggregateProducts: z.array(named.extend({ stockAggregates: stockAggregatesSchema, stockChoices: stockChoicesSchema }).strict()), issuer: z.object({ crt: z.string(), issuerState: z.string() }).strict().nullable(),
}).strict().nullable();
