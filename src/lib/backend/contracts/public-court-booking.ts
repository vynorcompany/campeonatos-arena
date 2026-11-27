import { z } from "zod";
export const publicCourtBookingFields = {
  create: ["arenaSlug", "courtId", "startsAt", "durationMinutes", "serviceIds", "quotedTotalCents", "matchId"],
  cancel: ["arenaSlug", "occurrenceId"],
  payment: ["arenaSlug", "occurrenceId", "method"],
} as const;
export type PublicCourtBookingOperation = keyof typeof publicCourtBookingFields;
export function publicCourtBookingInputSchema(operation: PublicCourtBookingOperation) {
  return z.object({ fields: z.record(z.string(), z.array(z.string().max(512)).min(1).max(12)) }).strict().superRefine(({ fields }, ctx) => {
    for (const [key, values] of Object.entries(fields)) {
      if (!(publicCourtBookingFields[operation] as readonly string[]).includes(key) || (key !== "serviceIds" && values.length !== 1)) ctx.addIssue({ code: "custom", message: "Campo inválido.", path: ["fields", key] });
    }
    if (!fields.arenaSlug?.[0]?.trim()) ctx.addIssue({ code: "custom", message: "Arena obrigatória.", path: ["fields", "arenaSlug"] });
  });
}
const checkoutUrl = z.string().max(8192).refine(value => {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
});
const created = z.union([
  z.object({ ok: z.literal(false), error: z.string().max(2000) }).strict(),
  z.object({ ok: z.literal(true), occurrenceId: z.string().min(1).max(128), checkoutUrl, calendarUrl: z.string().max(512).startsWith("/api/reservar/"), reservationStatus: z.enum(["PENDING_PAYMENT", "PENDING_CONFIRMATION", "SCHEDULED"]) }).strict(),
]);
export const publicCourtBookingOutcomeSchema = z.object({ error: z.string().max(2000).nullable(), result: z.union([created, z.object({ checkoutUrl }).strict()]).nullable() }).strict();
export type PublicCourtBookingOutcome = z.infer<typeof publicCourtBookingOutcomeSchema>;
