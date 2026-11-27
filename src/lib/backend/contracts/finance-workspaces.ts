import { z } from 'zod';
export const financeWorkspaceSchema = z.enum(['plans', 'monthly', 'payroll']);
export type FinanceWorkspace = z.infer<typeof financeWorkspaceSchema>;
export const financeWorkspaceQuerySchema = z.object({ mes: z.string().max(7).optional() }).strict();
const named = z.object({ id: z.string(), name: z.string() }).strict();
const cents = z.number().int();
const plan = z.object({ id: z.string(), name: z.string(), active: z.boolean(), monthlyPriceCents: cents, classesPerMonth: z.number().int(), creditExpiryCycle: z.string(), creditExpiryDays: z.number().int().nullable(), teacherAssignments: z.array(z.object({ teacher: z.object({ name: z.string() }).strict() }).strict()) }).strict();
const amounts = { fixedSalaryCents: cents, monthlyMinutes: cents, overtimeMinutes: cents, overtimePercentage: z.number(), nightMinutes: cents, nightOvertimeMinutes: cents, nightPercentage: z.number(), nightHourMinutes: z.number(), bonusCents: cents, benefitsCents: cents, discountCents: cents, advanceCents: cents };
export const financeWorkspacePageSchema = z.object({
  referenceMonth: z.string(), plans: z.array(plan), students: z.array(named), bankAccounts: z.array(named),
  subscriptions: z.array(z.object({ id: z.string(), startedAt: z.iso.datetime(), dueDay: z.number().int(), monthlyPriceCents: cents, classesPerMonth: z.number().int(), student: z.object({ name: z.string() }).strict(), plan: z.object({ name: z.string() }).strict() }).strict()),
  employees: z.array(named),
  payroll: z.array(z.object({ ...amounts, id: z.string(), updatedAt: z.iso.datetime(), userId: z.string().nullable(), employeeName: z.string(), referenceMonth: z.string(), notes: z.string(), financialEntry: z.object({ updatedAt: z.iso.datetime(), amountCents: cents, status: z.string(), dueDate: z.string(), paidAt: z.string(), settlements: z.array(z.object({ amountCents: cents, interestCents: cents, discountCents: cents }).strict()) }).strict().nullable() }).strict()),
}).strict();
