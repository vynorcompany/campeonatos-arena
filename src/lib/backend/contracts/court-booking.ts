import { z } from "zod";
export const courtBookingFields = {
  save: ["courtPriceCents", "occurrenceId", "courtId", "courtIds", "title", "startsAt", "durationMinutes", "bookingTypeName", "repeatUntil", "teacherId", "responsiblePlayerId", "notes", "participants", "expectedUpdatedAt"],
  cancel: ["occurrenceId", "mode", "cancelOpenCharges"],
  confirm: ["occurrenceId"],
} as const;
export type CourtBookingOperation = keyof typeof courtBookingFields;
export function courtBookingInputSchema(operation: CourtBookingOperation) {
  return z.object({ fields: z.record(z.string(), z.array(z.string().max(65536)).length(1)) }).strict().superRefine((value, ctx) => {
    for (const key of Object.keys(value.fields)) if (!(courtBookingFields[operation] as readonly string[]).includes(key)) ctx.addIssue({ code: "custom", message: "Campo inesperado.", path: ["fields", key] });
  });
}
export const courtBookingOutcomeSchema = z.object({ error: z.string().nullable(), version: z.iso.datetime().optional() }).strict();
