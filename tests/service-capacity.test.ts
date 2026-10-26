import assert from "node:assert/strict";
import test from "node:test";
import { peakServiceOccupancy } from "../src/lib/calendar/service-capacity";

test("adjacent equipment bookings use one unit even when a longer reservation overlaps both", () => {
  assert.equal(peakServiceOccupancy([{ start: 0, end: 60 }, { start: 60, end: 120 }], 0, 120), 1);
  assert.equal(peakServiceOccupancy([{ start: 0, end: 60 }], 60, 120), 0);
});
test("equipment occupancy counts actual simultaneous bookings and clips to the requested period", () => {
  const windows = [{ start: 0, end: 90 }, { start: 30, end: 60 }, { start: 60, end: 120 }];
  assert.equal(peakServiceOccupancy(windows, 0, 120), 2);
  assert.equal(peakServiceOccupancy(windows, 91, 120), 1);
  assert.equal(peakServiceOccupancy(windows, 120, 150), 0);
  assert.equal(peakServiceOccupancy([], 0, 60), 0);
});
test("equipment periods must have a valid positive duration", () => {
  assert.throws(() => peakServiceOccupancy([], 10, 10), /inválido/);
  assert.throws(() => peakServiceOccupancy([], NaN, 10), /inválido/);
});
