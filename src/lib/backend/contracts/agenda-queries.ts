import { z } from "zod";
import { agendaDayInputSchema } from "./agenda-day";
export const agendaAvailabilityInputSchema = agendaDayInputSchema.extend({ courtId: z.string().trim().min(1).max(128), occurrenceId: z.string().trim().min(1).max(128).optional() }).strict();
export const agendaAvailabilitySchema = z.object({ slotMinutes: z.number().int().min(15).max(120), availableMinutes: z.array(z.number().int().min(0).max(1439)).max(96) }).strict();
export const agendaVersionSchema = z.object({ version: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
