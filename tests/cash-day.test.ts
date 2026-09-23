import assert from "node:assert/strict";
import test from "node:test";
import { cashReferenceDate } from "../src/lib/finance/cash-day";

test("daily cash follows the arena's Brazilian calendar, not the server's UTC date", () => {
  assert.equal(cashReferenceDate(new Date("2026-09-23T02:30:00.000Z")).toISOString(), "2026-09-22T00:00:00.000Z");
  assert.equal(cashReferenceDate(new Date("2026-09-23T03:00:00.000Z")).toISOString(), "2026-09-23T00:00:00.000Z");
});
