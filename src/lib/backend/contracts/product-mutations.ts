import { z } from 'zod';
export const productMutationFields = {
  'create-product': ['name','sku','notes','cost','price','categoryId','stockQuantity','minStock'],
  'update-product': ['productId','expectedUpdatedAt','name','sku','notes','cost','price','categoryId','stockQuantity','minStock'],
  'adjust-stock': ['productId','type','quantity','reason'], 'stock-balance': ['title','reason'],
  'create-sale': ['productId','quantity','bankAccountId','paymentMethod','customerName'], 'create-cart-sale': ['items','bankAccountId','paymentMethod','customerName'],
  'stock-aggregates': ['productId','stockAggregates','stockChoices'], 'product-fiscal': ['productId','fiscalProfile'],
  'save-service': ['id','name','price','bookingConcurrentLimit','bookingRules','serviceHourly','showOnAgenda','showOnComandas','showOnPortalBooking'], 'manage-service': ['id','operation'], 'standard-service-price': ['serviceCode','price'],
} as const;
export type ProductMutationOperation = keyof typeof productMutationFields;
export const productMutationOutcomeSchema = z.union([z.object({ error: z.string() }).strict(), z.object({}).strict()]);
export const stockBalanceOutcomeSchema = z.union([z.object({ error: z.string() }).strict(), z.object({ updated: z.number().int().min(1) }).strict()]);
export function productOutcomeSchema(operation: ProductMutationOperation) { return operation === 'stock-balance' ? stockBalanceOutcomeSchema : productMutationOutcomeSchema; }
export function allowedProductMutationField(operation: ProductMutationOperation, key: string) { return (productMutationFields[operation] as readonly string[]).includes(key) || operation === 'stock-balance' && key.startsWith('count_') && key.length > 6 && key.length <= 106; }
export function productMutationInputSchema(operation: ProductMutationOperation) {
  return z.object({ fields: z.record(z.string().max(106), z.string().max(operation === 'create-cart-sale' ? 524288 : 16384)) }).strict().superRefine((value, ctx) => {
    if (Object.keys(value.fields).length > 10002) ctx.addIssue({ code: 'custom', message: 'Too many fields' });
    for (const [key, content] of Object.entries(value.fields)) if (!allowedProductMutationField(operation, key) || key !== 'items' && content.length > 16384) ctx.addIssue({ code: 'custom', message: 'Unexpected field', path: ['fields', key] });
  });
}
export const productMutationModules = { 'create-product':'stock','update-product':'stock','adjust-stock':'stock','stock-balance':'stock','stock-aggregates':'stock','product-fiscal':'stock','save-service':'stock','manage-service':'stock','standard-service-price':'stock','create-sale':'pos','create-cart-sale':'pos' } as const;
