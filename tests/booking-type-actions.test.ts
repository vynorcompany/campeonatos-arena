import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("calendar actions support booking types and quick player creation", () => {
  const source = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");
  assert.match(source, /DEFAULT_BOOKING_TYPES/);
  assert.match(source, /createBookingTypeAction/);
  assert.match(source, /createQuickPlayerAction/);
  assert.match(source, /bookingTypeName/);
  assert.match(source, /phone.*min\(8/);
});
