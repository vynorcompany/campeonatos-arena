import { z } from "zod";
export const comandaFields = {
  create: ["date", "type", "cardNumber", "playerId", "label"],
  delete: ["comandaId"],
  "open-bookings": ["occurrenceId", "playerIds"],
  "add-product": ["durationMinutes", "comandaId", "productId", "quantity", "choices"],
  "item-quantity": ["itemId", "delta"],
  "item-edit": ["itemId", "quantity", "unitPriceCents", "expectedQuantity", "expectedUnitPriceCents"],
  finish: ["shares", "payments", "debtIds", "itemDiscounts", "splitItemIds", "splitIncludesBookings", "discountMode", "discountCents", "quotedTotalCents", "comandaId", "fiscalCustomerDocument", "creditCents", "allowEmpty", "allowPartial", "fiscalDocumentType", "excessDisposition"],
  "portal-open": ["arenaSlug"],
  "portal-close": ["arenaSlug", "comandaId"],
  "portal-product": ["arenaSlug", "comandaId", "productId", "quantity"],
  "portal-order": ["arenaSlug", "comandaId", "orderId", "items"],
  "confirm-request": ["requestId"],
} as const;
export type ComandaOperation = keyof typeof comandaFields;
export const portalComandaOperations: readonly ComandaOperation[] = ["portal-open", "portal-close", "portal-product", "portal-order"];
export function comandaInputSchema(operation: ComandaOperation) {
  return z.object({ fields: z.record(z.string(), z.array(z.string().max(131072)).length(1)) }).strict().superRefine(({ fields }, ctx) => {
    for (const key of Object.keys(fields)) if (!(comandaFields[operation] as readonly string[]).includes(key)) ctx.addIssue({ code: "custom", message: "Campo inesperado.", path: ["fields", key] });
    if (portalComandaOperations.includes(operation) && !fields.arenaSlug?.[0]?.trim()) ctx.addIssue({ code: "custom", message: "Arena obrigatória.", path: ["fields", "arenaSlug"] });
  });
}
export const comandaOutcomeSchema = z.object({
  error: z.string().max(3000).nullable(),
  comanda: z.object({ comandaId: z.string(), openedAt: z.iso.datetime(), reused: z.boolean(), message: z.string().optional() }).strict().optional(),
  comandaIds: z.array(z.string()).optional(),
}).strict();
export type ComandaOutcome = z.infer<typeof comandaOutcomeSchema>;
