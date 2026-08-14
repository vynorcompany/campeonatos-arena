import assert from "node:assert/strict";
import test from "node:test";
import { weeklyRangesOverlap } from "@/lib/scheduling/weekly-rule";

test("weekly periods overlap only when their minute ranges intersect", () => {
  assert.equal(weeklyRangesOverlap(420, 660, 600, 720), true);
  assert.equal(weeklyRangesOverlap(420, 660, 660, 720), false);
});
