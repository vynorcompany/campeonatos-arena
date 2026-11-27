import { z } from "zod";

export const calendarManagementFields = {
  "event-create": ["eventType", "title", "scheduledAt", "durationMinutes", "notes"],
  "event-update": ["sourceType", "lessonId", "calendarEventId", "eventType", "title", "scheduledAt", "durationMinutes", "notes"],
  "event-delete": ["sourceType", "lessonId", "calendarEventId"],
  "client-create": ["name", "phone", "email", "cpf", "class", "gender", "birthDate", "personType", "cnpj", "allowOverdueComandas"],
} as const;
export type CalendarManagementOperation = keyof typeof calendarManagementFields;
export function calendarManagementInputSchema(operation: CalendarManagementOperation) {
  return z.object({ fields: z.record(z.string(), z.array(z.string().max(16384)).length(1)) }).strict().superRefine((value, ctx) => {
    for (const key of Object.keys(value.fields)) {
      if (!(calendarManagementFields[operation] as readonly string[]).includes(key)) ctx.addIssue({ code: "custom", message: "Campo inesperado.", path: ["fields", key] });
    }
  });
}
export const calendarManagementOutcomeSchema = z.object({
  error: z.string().nullable(), id: z.string().optional(), name: z.string().optional(),
}).strict();
