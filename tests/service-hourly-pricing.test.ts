import assert from "node:assert/strict";
import test from "node:test";
import { servicePriceCents } from "../src/lib/products/service-pricing";
test("hourly equipment uses actual minutes and rounds the complete interval once", () => {
  assert.equal(servicePriceCents(1000, true, 60), 1000);
  assert.equal(servicePriceCents(1000, true, 90), 1500);
  assert.equal(servicePriceCents(1000, true, 120), 2000);
  assert.equal(servicePriceCents(999, true, 90), 1499);
  assert.equal(servicePriceCents(1000, false, 120), 1000);
});
test("rejects invalid durations and overflowing charges", () => {
  for (const minutes of [0, -1, 1.5, 1441, NaN]) assert.throws(() => servicePriceCents(1000, true, minutes));
  assert.throws(() => servicePriceCents(2147483647, true, 120));
});
