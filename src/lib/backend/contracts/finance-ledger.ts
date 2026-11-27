import { z } from 'zod';
const text = (maximum = 256) => z.string().max(maximum).optional();
const dateFilter = z.string().max(10).refine(value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value).optional();
export const financeLedgerQuerySchema = z.object({
  sort: text(32), direction: text(8), name: text(), start: dateFilter, end: dateFilter, status: text(32), paymentMethod: text(120), bankAccountId: text(), category: text(), description: text(2048), productId: text(), planId: text(), dateField: text(32), includeEarlier: text(8), includeVoided: text(8),
  page: text(12), pageSize: text(12), entryId: text(160), entry: text(160), ids: text(8192), id: text(160), focus: text(160),
}).strict();
export type FinanceLedgerQuery = z.infer<typeof financeLedgerQuerySchema>;
export type FinanceLedgerType = 'REVENUE' | 'EXPENSE';
const cents = z.number().int();
const option = z.object({ id: z.string(), name: z.string(), phone: z.string().optional(), teacherId: z.string().optional(), teacherName: z.string().optional(), monthlyPriceCents: cents.optional() }).strict();
export const financeAccountSchema = z.object({
  id: z.string(), updatedAt: z.string().datetime(), source: z.string(), canCardInstallment: z.boolean(), playerId: z.string().nullable(), supplierId: z.string().nullable(), payeeEmployeeId: z.string().nullable(), payeeTeacherId: z.string().nullable(), counterpartyName: z.string(), category: z.string(), description: z.string(), amountCents: cents,
  composition: z.object({ originalCents: cents, interestCents: cents, discountCents: cents, adjustedCents: cents, creationKnown: z.boolean() }).strict(),
  paymentMethod: z.string(), bankAccountId: z.string().nullable(), planId: z.string().nullable(), productId: z.string().nullable(),
  comanda: z.object({ id: z.string(), code: z.string(), label: z.string() }).strict().nullable(),
  onlineProvider: z.string(), onlinePaymentId: z.string(), onlinePaymentUrl: z.string(), onlinePaymentQrCode: z.string(), onlinePaymentMethod: z.string(), onlinePaymentPublishedAt: z.string().datetime().nullable(), onlinePaymentViewedAt: z.string().datetime().nullable(), competenceDate: z.string().nullable(), dueDate: z.string().nullable(), paidAt: z.string().nullable(), notes: z.string(), status: z.string(), voidReason: z.string(),
  settlements: z.array(z.object({ amountCents: cents, interestCents: cents, discountCents: cents, paymentMethod: z.string(), paidAt: z.string(), notes: z.string() }).strict()),
  balance: z.object({ originalCents: cents, interestCents: cents, paidCents: cents, outstandingCents: cents, settled: z.boolean() }).strict(),
}).strict();
export const financeLedgerPageSchema = z.object({
  ledger: z.object({ total: z.number().int().nonnegative(), activeCount: z.number().int().nonnegative(), totalCents: cents, entries: z.array(financeAccountSchema).max(100), page: z.number().int().positive(), pageSize: z.union([z.literal(20), z.literal(50), z.literal(100)]) }).strict(),
  filters: financeLedgerQuerySchema.omit({ includeEarlier: true, includeVoided: true, dateField: true }).extend({ includeEarlier: z.boolean(), includeVoided: z.boolean(), dateField: z.enum(['dueDate', 'paidAt']) }).strict(),
  paymentMethods: z.array(z.string()), categories: z.array(z.string()), banks: z.array(option), plans: z.array(option), products: z.array(option), suppliers: z.array(option), employees: z.array(option), teachers: z.array(option), clients: z.array(option),
}).strict();
