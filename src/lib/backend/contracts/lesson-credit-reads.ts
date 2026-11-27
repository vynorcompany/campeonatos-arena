import { z } from 'zod';
export const creditReadModeSchema = z.enum(['balance', 'requests']);
export const lessonCreditBalanceSchema = z.object({
  available: z.number().int(), batches: z.array(z.object({ id: z.string(), remaining: z.number().int(), expiresAt: z.iso.datetime().nullable(), near: z.boolean(), requestStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).nullable() }).strict()),
  makeupEnabled: z.boolean(), makeupPolicy: z.string(), noticeDays: z.number().int(),
}).strict().nullable();
export const lessonCreditRequestsSchema = z.array(z.object({ id: z.string(), message: z.string(), batch: z.object({ remaining: z.number().int(), expiresAt: z.iso.datetime().nullable(), student: z.object({ name: z.string() }).strict() }).strict() }).strict());
