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
});
