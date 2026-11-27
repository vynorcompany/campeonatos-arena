import assert from "node:assert/strict";
import test from "node:test";
import { calendarEventsInputSchema, calendarEventsSchema } from "../src/lib/backend/contracts/calendar-events";

test("calendar range rejects invalid dates, inverted periods and caller authority", () => {
  assert.equal(calendarEventsInputSchema.safeParse({ start: "2000-01-01", end: "2100-01-01" }).success, true);
  for (const input of [{ start: "2026-02-29", end: "2026-03-02" }, { start: "2026-12-08", end: "2026-12-07" }, { start: "2026-12-07", end: "2026-12-07" }, { start: "1900-01-01", end: "2200-01-01" }, { start: "2026-12-07", end: "2026-12-08", arenaId: "foreign" }]) assert.equal(calendarEventsInputSchema.safeParse(input).success, false);
});

test("calendar presentation excludes raw students, teachers and credentials", () => {
  const event = { id: "event", sourceType: "lesson", lessonId: "event", calendarEventId: "", eventType: "AULA", type: "lessons", day: "2026-12-07", minute: 600, second: 0, millisecond: 0, title: "Aula", meta: "Professor · 2 aluno(s)", notes: "", durationMinutes: 60 };
  assert.equal(calendarEventsSchema.safeParse({ events: [event] }).success, true);
  assert.equal(calendarEventsSchema.safeParse({ events: [{ ...event, attendances: [{ email: "private" }] }] }).success, false);
  assert.equal(calendarEventsSchema.safeParse({ events: [{ ...event, teacher: { phone: "private" } }] }).success, false);
  assert.equal(calendarEventsSchema.safeParse({ events: [{ ...event, minute: 1440 }] }).success, false);
});

test("calendar wall-clock fields retain their date and time across frontend timezones", async () => {
  const { execFileSync } = await import("node:child_process");
  const program = `import {calendarClockDate} from './src/lib/calendar/event-clock.ts'; const date=calendarClockDate({day:'2026-12-07',minute:600,second:12,millisecond:345}); console.log(JSON.stringify([date.getFullYear(),date.getMonth()+1,date.getDate(),date.getHours(),date.getMinutes(),date.getSeconds(),date.getMilliseconds()]));`;
  for (const TZ of ["UTC", "America/Sao_Paulo", "Asia/Tokyo"]) {
    const result = execFileSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", program], { cwd: process.cwd(), env: { ...process.env, TZ }, encoding: "utf8" });
    assert.deepEqual(JSON.parse(result), [2026, 12, 7, 10, 0, 12, 345], TZ);
  }
});
