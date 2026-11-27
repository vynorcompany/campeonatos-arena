import { z } from "zod";
import { agendaDayInputSchema } from "./agenda-day";
import { serviceBookingRulesSchema } from "@/lib/calendar/service-booking-rules";
export const publicBookingViewInputSchema = z.object({ arenaSlug: z.string().trim().min(1).max(160), date: agendaDayInputSchema.shape.date.optional(), matchId: z.string().trim().min(1).max(160).optional() }).strict();
const slot = z.object({ startsAt: z.string(), label: z.string(), priceCents: z.number().int().nonnegative(), durationPrices: z.record(z.string(), z.number().int().nonnegative()), durations: z.array(z.number().int().positive()), standardDurations: z.array(z.number().int().positive()), availableMinutes: z.array(z.number().int()), blockedMinutes: z.array(z.number().int()) }).strict();
const service = z.object({ id: z.string(), name: z.string(), priceCents: z.number().int().nonnegative(), serviceHourly: z.boolean(), limit: z.number().int().positive(), conditions: z.array(z.object({ label: z.string(), value: z.string() }).strict()), rules: serviceBookingRulesSchema, busy: z.array(z.object({ start: z.number(), end: z.number() }).strict()) }).strict();
export const publicBookingViewSchema = z.object({
  selectedDate: agendaDayInputSchema.shape.date, today: agendaDayInputSchema.shape.date,
  arena: z.object({ name: z.string(), logoUrl: z.string(), checkinEnabled: z.boolean(), onlineBookingEnabled: z.boolean(), onlineBookingLayout: z.string(), onlineBookingPaymentEnabled: z.boolean(), operationalSettings: z.object({ portalConsumptionEnabled: z.boolean() }).strict().nullable() }).strict(),
  currentClient: z.object({ name: z.string() }).strict().nullable(),
  matchSummary: z.object({ title: z.string(), athletes: z.array(z.string()) }).strict().nullable(),
  delinquency: z.object({ blocked: z.boolean(), requiresReview: z.boolean(), reviewReference: z.string().nullable() }).strict(),
  courts: z.array(z.object({ id: z.string(), name: z.string(), color: z.string(), slotMinutes: z.number().int().positive(), slots: z.array(slot) }).strict()),
  bookingServices: z.array(service),
  pendingReservation: z.object({ id: z.string(), status: z.enum(["PENDING_PAYMENT", "PENDING_CONFIRMATION"]), label: z.string() }).strict().nullable(),
}).strict();
