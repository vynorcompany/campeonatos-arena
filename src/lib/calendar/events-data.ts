import "server-only";
import { calendarClockDate } from "./event-clock";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { readBackendContract } from "@/lib/backend/http-client";
import { calendarEventsInputSchema, calendarEventsSchema } from "@/lib/backend/contracts/calendar-events";
export async function getCalendarEvents(arenaId: string, input: { start: string; end: string }) {
  calendarEventsInputSchema.parse(input);
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const result = origin ? await readBackendContract(origin, `/api/management/calendar?${new URLSearchParams(input)}`, calendarEventsSchema, { cookie: await managementCookieHeader() ?? "" }, { timeoutMs: 60000 })
    : await (await import("@/lib/backend/services/calendar-events-data")).resolveCalendarEvents(arenaId, input);
  return result.events.map(({ day, minute, second, millisecond, ...event }) => {
    return { ...event, date: calendarClockDate({ day, minute, second, millisecond }) };
  });
}
