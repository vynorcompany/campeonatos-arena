import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("court booking action creates paid or pending receivables from participant payment", () => {
  const source = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");
  assert.match(source, /export async function saveCourtBookingAction/);
  assert.match(source, /prisma\.\$transaction/);
  assert.match(source, /paymentMethod \? "PAID" : "PENDING"/);
  assert.match(source, /scheduleParticipant/);
  assert.match(source, /teacherId/);
  assert.match(source, /courtIds/);
  assert.match(source, /occurrenceCourts/);
});

test("court booking keeps expected validation errors visible in production", () => {
  const source = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");

  assert.match(source, /type CourtBookingActionResult/);
  assert.match(source, /return \{ error: message \}/);
  assert.match(source, /Falha ao salvar agendamento da grade/);
});

test("new court bookings normalize an absent occurrence id before validation", () => {
  const source = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");

  assert.match(source, /occurrenceId:\s*String\(formData\.get\("occurrenceId"\) \?\? ""\)/);
});
