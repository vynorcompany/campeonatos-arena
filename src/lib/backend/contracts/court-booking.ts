import { z } from "zod";
export const courtBookingFields = {
  save: ["courtPriceCents", "occurrenceId", "courtId", "courtIds", "title", "startsAt", "durationMinutes", "bookingTypeName", "repeatUntil", "teacherId", "responsiblePlayerId", "notes", "participants", "expectedUpdatedAt"],
  cancel: ["occurrenceId", "mode", "cancelOpenCharges"],
  confirm: ["occurrenceId"],
  checkin: ["occurrenceId", "playerId"],
  "service-add": ["occurrenceId", "productId"],
  "service-remove": ["occurrenceId", "serviceId"],
  "block-slots": ["slots"],
  move: ["occurrenceId", "courtId"],
  "release-block": ["occurrenceId"],
  "open-slot": ["courtId", "date", "startsAtMinute", "endsAtMinute", "priceCents", "online"],
} as const;
export type CourtBookingOperation = keyof typeof courtBookingFields;
export function courtBookingInputSchema(operation: CourtBookingOperation) {
  return z.object({ fields: z.record(z.string(), z.array(z.string().max(65536)).length(1)) }).strict().superRefine((value, ctx) => {
    for (const key of Object.keys(value.fields)) if (!(courtBookingFields[operation] as readonly string[]).includes(key)) ctx.addIssue({ code: "custom", message: "Campo inesperado.", path: ["fields", key] });
  });
}
const bookingChargesSchema = z.object({
  version: z.iso.datetime(), totalAmountCents: z.number().int().min(0),
  participants: z.array(z.object({ playerId: z.string(), amountCents: z.number().int().min(0), paymentMethod: z.string(), bankAccountId: z.string().optional(), checkedInAt: z.iso.datetime().nullable() }).strict()),
  services: z.array(z.object({ id: z.string(), name: z.string(), priceCents: z.number().int().min(0) }).strict()),
}).strict();
export const courtBookingOutcomeSchema = z.object({ error: z.string().nullable(), version: z.iso.datetime().optional(), checkedInAt: z.iso.datetime().optional(), charges: bookingChargesSchema.optional() }).strict();
export type CourtBookingOutcome = z.infer<typeof courtBookingOutcomeSchema>;
