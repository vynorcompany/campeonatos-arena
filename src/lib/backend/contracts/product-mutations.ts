import { z } from 'zod';
export const productMutationFields = { 'save-service': ['id', 'name', 'price', 'bookingConcurrentLimit', 'bookingRules', 'serviceHourly', 'showOnAgenda', 'showOnComandas', 'showOnPortalBooking'], 'manage-service': ['id', 'operation'], 'standard-service-price': ['serviceCode', 'price'] } as const;
export type ProductMutationOperation = keyof typeof productMutationFields;
export const productMutationOutcomeSchema = z.union([z.object({ error: z.string() }).strict(), z.object({}).strict()]);
export function productMutationInputSchema(operation: ProductMutationOperation) {
  return z.object({ fields: z.record(z.string(), z.string().max(16384)) }).strict().superRefine((value, ctx) => { for (const key of Object.keys(value.fields)) if (!(productMutationFields[operation] as readonly string[]).includes(key)) ctx.addIssue({ code: 'custom', message: 'Unexpected field', path: ['fields', key] }); });
}
