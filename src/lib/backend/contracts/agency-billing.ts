import { z } from "zod";
const text = z.string().max(4096);
export const agencyBillingFields = {
  plan: ["id", "name", "monthlyPrice"], assign: ["arenaId", "planId"],
  status: ["subscriptionId", "status"], checkout: ["invoiceId"], grace: ["graceDays", "enabled"],
} as const;
export type AgencyBillingOperation = keyof typeof agencyBillingFields;
const inputs = {
  plan: z.object({ id: text.optional(), name: text, monthlyPrice: text }).strict(),
  assign: z.object({ arenaId: text, planId: text }).strict(),
  status: z.object({ subscriptionId: text, status: text }).strict(),
  checkout: z.object({ invoiceId: text }).strict(),
  grace: z.object({ graceDays: text.optional(), enabled: text.optional() }).strict(),
};
export function agencyBillingInputSchema(operation: AgencyBillingOperation) { return inputs[operation]; }
export const agencyBillingOutcomeSchema = z.object({ error: z.string().nullable(), changed: z.boolean() }).strict();
export function agencyBillingPayload(operation: AgencyBillingOperation, form: FormData) {
  const fields: Record<string, string> = {};
  for (const key of agencyBillingFields[operation]) {
    const values = form.getAll(key);
    if (values.length > 1 || values.some(value => typeof value !== "string")) throw new Error("Campo inválido.");
    if (values.length) fields[key] = values[0] as string;
  }
  return agencyBillingInputSchema(operation).parse(fields);
}
