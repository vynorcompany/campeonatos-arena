import assert from "node:assert/strict";
import test from "node:test";
import { intervalsOverlap } from "@/lib/scheduling/interval";

const at = (value: string) => new Date(`${value}:00.000Z`);

test("treats intersecting court bookings as a conflict", () => {
  assert.equal(
    intervalsOverlap(at("2026-08-20T18:00"), at("2026-08-20T19:00"), at("2026-08-20T18:30"), at("2026-08-20T19:30")),
    true
  );
});

test("allows consecutive court bookings without a conflict", () => {
  assert.equal(
    intervalsOverlap(at("2026-08-20T18:00"), at("2026-08-20T19:00"), at("2026-08-20T19:00"), at("2026-08-20T20:00")),
    false
  );
});
