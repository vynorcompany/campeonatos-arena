import assert from "node:assert/strict";
import { test } from "node:test";
import { agencyBillingDay, agencyInvoicePeriod, nextAgencyDueDate } from "../src/lib/finance/agency-billing-dates";

test("agency invoice period follows the São Paulo calendar", () => {
  assert.equal(agencyInvoicePeriod(new Date("2026-10-01T02:59:00Z")), "2026-09");
  assert.equal(agencyInvoicePeriod(new Date("2026-10-01T03:00:00Z")), "2026-10");
  assert.equal(agencyBillingDay(new Date("2026-10-01T02:59:00Z")), 30);
});

test("monthly billing preserves the original day after short months", () => {
  const february = nextAgencyDueDate(new Date("2027-01-31T12:00:00Z"), 31);
  assert.equal(february.toISOString(), "2027-02-28T12:00:00.000Z");
  assert.equal(nextAgencyDueDate(february, 31).toISOString(), "2027-03-31T12:00:00.000Z");
});

test("monthly billing respects leap years", () => {
  assert.equal(nextAgencyDueDate(new Date("2028-01-31T12:00:00Z"), 31).toISOString(), "2028-02-29T12:00:00.000Z");
});

test("monthly billing does not drift across UTC month boundaries", () => {
  const due = new Date("2026-10-01T02:30:00Z"); // 30/09 às 23:30 em São Paulo
  assert.equal(nextAgencyDueDate(due, 30).toISOString(), "2026-10-31T02:30:00.000Z");
});
