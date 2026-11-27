import { z } from 'zod';
export const financialSettingsAreaSchema = z.enum(['categorias-produtos', 'cupons', 'notas-fiscais', 'pagamentos-online', 'categorias-financeiras', 'formas-pagamento', 'contas-bancarias', 'fornecedores']);
export type FinancialSettingsArea = z.infer<typeof financialSettingsAreaSchema>;
const supplierSchema = z.object({ id: z.string(), name: z.string(), document: z.string(), phone: z.string(), email: z.string(), notes: z.string(), active: z.boolean() }).strict();
export const financialSettingsPageSchema = z.object({
  productCategories: z.array(z.object({ id: z.string(), name: z.string(), active: z.boolean(), _count: z.object({ products: z.number().int().nonnegative() }).strict() }).strict()),
  coupons: z.array(z.object({ id: z.string(), code: z.string(), discountType: z.string(), discountValue: z.number(), minimumAmountCents: z.number().int(), maxUses: z.number().int().nullable(), usesCount: z.number().int(), startsAt: z.iso.datetime().nullable(), endsAt: z.iso.datetime().nullable(), active: z.boolean() }).strict()),
  fiscal: z.object({ crt: z.string(), issuerState: z.string(), provider: z.string(), environment: z.string(), series: z.string(), nextNumber: z.number().int(), notes: z.string(), focusCnpj: z.string(), hasFocusTokens: z.boolean() }).strict().nullable(),
  connections: z.array(z.object({ provider: z.string(), status: z.string(), displayName: z.string(), accountReference: z.string() }).strict()),
  categories: z.array(z.object({ id: z.string(), name: z.string(), type: z.string(), dreGroup: z.string() }).strict()),
  rows: z.array(z.object({ id: z.string(), name: z.string(), detail: z.string(), balance: z.number().int(), type: z.string(), supplier: supplierSchema.optional() }).strict()),
}).strict();
