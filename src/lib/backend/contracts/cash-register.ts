import { z } from 'zod';
export const cashMutationFields = { open: ['openingAmount','openingNotes'], movement: ['registerId','type','amount','description'], close: ['registerId','countedAmount','closingNotes'] } as const;
export type CashMutation = keyof typeof cashMutationFields;
export function cashMutationInputSchema(operation: CashMutation) {
  return z.object({ fields: z.record(z.string().max(40), z.string().max(4096)) }).strict().superRefine((value, ctx) => {
    for (const key of Object.keys(value.fields)) if (!(cashMutationFields[operation] as readonly string[]).includes(key)) ctx.addIssue({ code: 'custom', message: 'Unexpected field', path: ['fields', key] });
  });
}
export const cashMutationOutcomeSchema = z.union([z.object({}).strict(), z.object({ error: z.string() }).strict()]);
export const cashWorkspaceDataSchema = z.object({ referenceDate: z.iso.datetime(), register: z.object({ id: z.string(), status: z.string(), openingAmountCents: z.number().int(), expectedAmountCents: z.number().int(), countedAmountCents: z.number().int().nullable(), differenceCents: z.number().int().nullable(), movements: z.array(z.object({ id: z.string(), type: z.string(), amountCents: z.number().int(), description: z.string() }).strict()) }).strict().nullable(), previousClosing: z.object({ countedAmountCents: z.number().int().nullable(), expectedAmountCents: z.number().int() }).strict().nullable() }).strict();
export const salesWorkspaceDataSchema = z.object({ sales: z.array(z.object({ id: z.string(), code: z.string(), totalCents: z.number().int(), paymentMethod: z.string(), createdAt: z.iso.datetime(), items: z.array(z.object({ quantity: z.number().int(), productName: z.string() }).strict()) }).strict()), stockMovements: z.array(z.object({ id: z.string(), productName: z.string(), type: z.string(), quantity: z.number().int(), reason: z.string(), createdAt: z.iso.datetime() }).strict()) }).strict();
