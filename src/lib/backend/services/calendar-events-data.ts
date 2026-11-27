import "server-only";
import { withArenaTransaction } from "@/lib/rls";
import { parseAgendaDay } from "@/lib/backend/contracts/agenda-day";
import { calendarEventsInputSchema, calendarEventsSchema } from "@/lib/backend/contracts/calendar-events";
function clock(value: Date) {
  return { day: `${String(value.getFullYear()).padStart(4, "0")}-${String(value.getMonth()+1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`, minute: value.getHours()*60+value.getMinutes(), second: value.getSeconds(), millisecond: value.getMilliseconds() };
}
export async function resolveCalendarEvents(arenaId: string, input: { start: string; end: string }) {
  calendarEventsInputSchema.parse(input);
  const scheduledAt = { gte: parseAgendaDay(input.start)!, lt: parseAgendaDay(input.end)! };
  return withArenaTransaction(arenaId, async tx => {
    const [lessons, events] = await Promise.all([
      tx.lesson.findMany({ where: { arenaId, scheduledAt }, select: { id: true, scheduledAt: true, title: true, notes: true, durationMinutes: true, teacher: { select: { name: true } }, _count: { select: { attendances: true } } }, orderBy: { scheduledAt: "asc" } }),
      tx.calendarEvent.findMany({ where: { arenaId, scheduledAt }, select: { id: true, scheduledAt: true, title: true, eventType: true, notes: true, durationMinutes: true }, orderBy: { scheduledAt: "asc" } }),
    ]);
    return calendarEventsSchema.parse({ events: [
      ...lessons.filter(lesson => lesson.scheduledAt).map(lesson => ({ id: lesson.id, sourceType: "lesson", lessonId: lesson.id, calendarEventId: "", eventType: "AULA", type: "lessons", ...clock(lesson.scheduledAt!), title: lesson.title, meta: `${lesson.teacher?.name ?? "Sem professor"} · ${lesson._count.attendances} aluno(s)`, notes: lesson.notes ?? "", durationMinutes: lesson.durationMinutes })),
      ...events.map(event => ({ id: event.id, sourceType: "calendar", lessonId: "", calendarEventId: event.id, eventType: event.eventType, type: "lessons", ...clock(event.scheduledAt), title: event.title, meta: event.eventType === "EVENTO" ? "Evento da agenda" : event.eventType, notes: event.notes ?? "", durationMinutes: event.durationMinutes })),
    ] });
  }, { maxWait: 10000, timeout: 20000 });
}
