import assert from "node:assert/strict";
import test from "node:test";
import { buildCategoryBracketSeeds } from "@/lib/tournament/bracket";

test("bracket seeds use the next power of two and preserve byes", () => {
  assert.deepEqual(buildCategoryBracketSeeds(["a", "b", "c"]), [{ home: "a", away: null }, { home: "b", away: "c" }]);
});

test("a bracket needs at least two confirmed registrations", () => {
  assert.throws(() => buildCategoryBracketSeeds(["a"]), /ao menos 2 inscrições/);
});
