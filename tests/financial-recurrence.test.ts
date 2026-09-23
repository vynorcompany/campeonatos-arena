import assert from "node:assert/strict";
import test from "node:test";
import { getFinancialRecurrenceDates, getNextFinancialRecurrenceDate } from "@/lib/finance/recurrences";

test("advances weekly, monthly and annual financial recurrence dates", () => {
  assert.equal(getNextFinancialRecurrenceDate(new Date("2026-08-19T12:00:00Z"), "WEEKLY").toISOString(), "2026-08-26T12:00:00.000Z");
  assert.equal(getNextFinancialRecurrenceDate(new Date("2026-01-31T12:00:00Z"), "MONTHLY").toISOString(), "2026-02-28T12:00:00.000Z");
  assert.equal(getNextFinancialRecurrenceDate(new Date("2024-02-29T12:00:00Z"), "ANNUAL").toISOString(), "2025-02-28T12:00:00.000Z");
});

test("materializes recurrence dates separately from financial persistence", () => {
  const dates = getFinancialRecurrenceDates(new Date("2026-01-31T12:00:00Z"), "MONTHLY", new Date("2026-03-31T12:00:00Z"));
  assert.deepEqual(dates.map((item) => item.toISOString()), ["2026-01-31T12:00:00.000Z", "2026-02-28T12:00:00.000Z", "2026-03-28T12:00:00.000Z"]);
});
