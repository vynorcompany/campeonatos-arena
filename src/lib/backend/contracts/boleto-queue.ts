import { z } from 'zod';
export const boletoQueueQuerySchema = z.object({ status: z.enum(['queue','issued','canceled']).default('queue'), q: z.string().max(120).default('') }).strict();
export const boletoQueueDataSchema = z.object({ capped: z.boolean(), rows: z.array(z.object({ id: z.string(), payerId: z.string().nullable(), missingFields: z.array(z.string()), name: z.string(), description: z.string(), dueDate: z.iso.datetime().nullable(), amountCents: z.number().int(), status: z.string(), selectable: z.boolean(), issued: z.boolean() }).strict()).max(200) }).strict();
export const boletoQueueOperationSchema = z.enum(['generate','cancel','cancel-batch','reconcile']);
export type BoletoQueueOperation = z.infer<typeof boletoQueueOperationSchema>;
const entryId = z.string().min(1).max(200);
export function boletoQueueInputSchema(operation: BoletoQueueOperation) {
  return z.object({ entryId: entryId.optional(), entryIds: z.array(entryId).min(1).max(100).optional() }).strict().refine(value => operation === 'reconcile' ? value.entryId === undefined && value.entryIds === undefined : operation === 'cancel-batch' ? value.entryId === undefined && value.entryIds !== undefined : value.entryId !== undefined && value.entryIds === undefined);
}
export const boletoQueueOutcomeSchema = z.object({ success: z.literal(true).optional(), error: z.string().optional(), failedIds: z.array(z.string()).max(100).optional(), retired: z.number().int().min(0).optional(), failed: z.number().int().min(0).optional() }).strict().refine(value => value.success || value.error || (value.retired !== undefined && value.failed !== undefined));
export type BoletoQueueOutcome = z.infer<typeof boletoQueueOutcomeSchema>;
