import { z } from 'zod';
export const teacherBillingFields = {
  preview: ['teacherId', 'subscriptionId', 'targetPlanId', 'newDueDate'],
  transfer: ['teacherId', 'subscriptionId', 'targetPlanId', 'newDueDate', 'quoteToken'],
  schedule: ['teacherId', 'planId', 'amount', 'effectiveDate'],
  cancel: ['changeId'],
} as const;
export type TeacherBillingOperation = keyof typeof teacherBillingFields;
const cents = z.number().int();
export const teacherTransferQuoteSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), studentName: z.string(), oldPlanName: z.string(), newPlanName: z.string(), oldPriceCents: cents, newPriceCents: cents, currentDueDate: z.string(), newDueDate: z.string(), cycleDays: z.number().int(), remainingDays: z.number().int(), newDays: z.number().int(), planDifferenceCents: cents, dueDateDifferenceCents: cents, differenceCents: cents, affectedInstallments: z.number().int(), issuedCharges: z.number().int(), removedGroups: z.array(z.string()) }).strict();
const error = z.object({ error: z.string() }).strict();
export const teacherTransferPreviewSchema = z.union([error, z.object({ quote: teacherTransferQuoteSchema }).strict()]);
export const teacherBillingMutationSchema = z.union([error, z.object({}).strict()]);
export function teacherBillingOutcomeSchema(operation: TeacherBillingOperation) { return operation === 'preview' ? teacherTransferPreviewSchema : teacherBillingMutationSchema; }
export function teacherBillingInputSchema(operation: TeacherBillingOperation) {
  return z.object({ fields: z.record(z.string(), z.string().max(16384)) }).strict().superRefine((value, ctx) => {
    for (const key of Object.keys(value.fields)) if (!(teacherBillingFields[operation] as readonly string[]).includes(key)) ctx.addIssue({ code: 'custom', message: 'Unexpected field', path: ['fields', key] });
  });
}
