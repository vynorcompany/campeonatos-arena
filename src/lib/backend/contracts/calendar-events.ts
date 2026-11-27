import { z } from "zod";
import { parseAgendaDay } from "./agenda-day";
const date = z.string().refine(value => parseAgendaDay(value) !== null, "Data inválida.");
export const calendarEventsInputSchema = z.object({ start: date, end: date }).strict().superRefine((value, ctx) => {
  const start = parseAgendaDay(value.start), end = parseAgendaDay(value.end);
  if (!start || !end) return;
  if (end <= start || end.getTime() - start.getTime() > 36600 * 86400000) ctx.addIssue({ code: "custom", message: "Período inválido." });
});
export const calendarEventsSchema = z.object({ events: z.array(z.object({
  id: z.string(), sourceType: z.enum(["lesson", "calendar"]), lessonId: z.string(), calendarEventId: z.string(), eventType: z.string(), type: z.literal("lessons"),
  day: date, minute: z.number().int().min(0).max(1439), second: z.number().int().min(0).max(59), millisecond: z.number().int().min(0).max(999),
  title: z.string(), meta: z.string(), notes: z.string(), durationMinutes: z.number().int(),
}).strict()) }).strict();
