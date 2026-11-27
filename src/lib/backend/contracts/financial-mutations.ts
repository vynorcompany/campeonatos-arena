import { z } from "zod";
export const financialMutationFields = {
  "settings-create-financial-setting": ["area", "bankName", "document", "dreGroup", "email", "name", "notes", "openingBalance", "phone", "type"],
  "settings-reconcile-bank-account-balance": ["balance", "bankAccountId"],
  "settings-create-product-category": ["name"],
  "settings-create-coupon": ["code", "discountType", "discountValue", "endsAt", "maxUses", "minimumAmount", "startsAt"],
  "settings-update-coupon": ["active", "code", "couponId", "discountType", "discountValue", "endsAt", "maxUses", "minimumAmount", "startsAt"],
  "settings-delete-coupon": ["couponId"],
  "settings-toggle-coupon-active": ["active", "couponId"],
  "settings-update-financial-category": ["categoryId", "dreGroup", "name", "type"],
  "settings-delete-financial-category": ["categoryId"],
  "settings-update-supplier": ["active", "document", "email", "name", "notes", "phone", "supplierId"],
  "settings-delete-supplier": ["supplierId"],
  "settings-update-fiscal-settings": ["crt", "environment", "issuerState", "nextNumber", "notes", "provider", "series", "focusCnpj", "focusSandboxToken", "focusProductionToken", "confirmProduction"],
  "settings-update-online-payment-settings": ["cardEnabled", "instructions", "pixEnabled", "provider", "webhookUrl"],
  "settings-connect-payment-provider": ["accessToken", "certificate", "certificatePassword", "clientId", "clientSecret", "environment", "pixKey", "privateKey", "provider"],

  "create": [
    "amount",
    "bankAccountId",
    "cardInstallmentCount",
    "cardInstallmentRows",
    "category",
    "clientId",
    "competenceDate",
    "counterpartyName",
    "description",
    "discount",
    "discountMode",
    "dueDate",
    "installmentRequestId",
    "interest",
    "notes",
    "paidAt",
    "payeeId",
    "payeeKind",
    "paymentMethod",
    "planId",
    "productId",
    "status",
    "supplierId",
    "teacherId",
    "type"
  ],
  "update": [
    "amount",
    "bankAccountId",
    "category",
    "competenceDate",
    "counterpartyName",
    "description",
    "dueDate",
    "entryId",
    "expectedUpdatedAt",
    "notes",
    "payeeId",
    "payeeKind",
    "planId",
    "productId",
    "supplierId"
  ],
  "recurrence": [
    "amount",
    "bankAccountId",
    "category",
    "clientId",
    "counterpartyName",
    "description",
    "discount",
    "discountMode",
    "endsAt",
    "frequency",
    "interest",
    "notes",
    "onlinePaymentMethod",
    "payeeId",
    "payeeKind",
    "planId",
    "startsAt",
    "supplierId",
    "teacherId",
    "type"
  ],
  "charge": [
    "amount",
    "bankAccountId",
    "discount",
    "discountMode",
    "entryId",
    "interest",
    "method"
  ],
  "settle": [
    "amount",
    "bankAccountId",
    "discount",
    "discountMode",
    "entryId",
    "expectedUpdatedAt",
    "interest",
    "notes",
    "paidAt",
    "paymentMethod"
  ],
  "settle-bulk": [
    "bankAccountId",
    "entryIds",
    "expectedVersions",
    "paidAt",
    "paymentMethod"
  ],
  "void": [
    "entryId",
    "reason"
  ],
  "delete": [
    "entryId"
  ],
  "delete-bulk": [
    "entryIds"
  ],
  "split-card": [
    "cardInstallmentCount",
    "cardInstallmentRows",
    "dueDate",
    "entryId",
    "expectedUpdatedAt",
    "installmentRequestId"
  ]
} as const;
export type FinancialMutationOperation = keyof typeof financialMutationFields;
export const financialMutationOperations = Object.keys(financialMutationFields) as FinancialMutationOperation[];
export const financialChargeOutcomeSchema = z.union([
  z.object({ error: z.string() }).strict(),
  z.object({ url: z.string().refine(value => { if (!value) return true; try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; } }), code: z.string(), method: z.enum(['PIX', 'BOLETO']) }).strict(),
]);
export const financialMutationOutcomeSchema = z.union([
  financialChargeOutcomeSchema, z.object({ notice: z.string() }).strict(), z.object({}).strict(),
]);
export function financialMutationInputSchema(operation: FinancialMutationOperation) {
  return z.object({ fields: z.record(z.string(), z.array(z.string().max(524288)).min(1).max(operation.endsWith('-bulk') ? 2000 : 1)) }).strict().superRefine((input, ctx) => {
    for (const [key, values] of Object.entries(input.fields)) {
      if (!(financialMutationFields[operation] as readonly string[]).includes(key)) ctx.addIssue({ code: 'custom', message: 'Unexpected field', path: ['fields', key] });
      if (key !== 'entryIds' && values.length !== 1) ctx.addIssue({ code: 'custom', message: 'Repeated scalar field', path: ['fields', key] });
      const maximum = key === 'expectedVersions' ? 524288 : key === 'cardInstallmentRows' ? 10000 : ['certificate', 'privateKey'].includes(key) ? 65536 : 16384;
      if (values.some(value => value.length > maximum)) ctx.addIssue({ code: 'custom', message: 'Field too long', path: ['fields', key] });
    }
  });
}
