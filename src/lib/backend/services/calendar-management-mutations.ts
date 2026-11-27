import "server-only";
import * as events from "./calendar-events-actions";
import { createQuickPlayerAction } from "./calendar-clients-actions";
import { calendarManagementOutcomeSchema, type CalendarManagementOperation } from "@/lib/backend/contracts/calendar-management";
const operations = {
  "event-create": events.createCalendarEventAction,
  "event-update": events.updateCalendarEventAction,
  "event-delete": events.deleteCalendarEventAction,
  "client-create": createQuickPlayerAction,
};
export async function executeCalendarManagementMutation(operation: CalendarManagementOperation, fields: Record<string, string[]>) {
  const form = new FormData();
  for (const [key, values] of Object.entries(fields)) for (const value of values) form.append(key, value);
  const result = await operations[operation](form) as { error?: string; id?: string; name?: string } | void;
  return calendarManagementOutcomeSchema.parse({ error: result?.error ?? null, ...(result?.id ? { id: result.id, name: result.name } : {}) });
}
