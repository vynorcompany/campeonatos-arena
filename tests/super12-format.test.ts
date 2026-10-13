import assert from "node:assert/strict";
import test from "node:test";
import { super12GroupSetupError } from "../src/lib/super12/format";

test("quatro grupos exigem oito duplas para classificar dois primeiros", () => {
  assert.match(super12GroupSetupError(7, 4, "TOP_TWO") ?? "", /ao menos 8 duplas/);
  assert.equal(super12GroupSetupError(8, 4, "TOP_TWO"), null);
  assert.match(super12GroupSetupError(8, 3, "TOP_TWO") ?? "", /4 grupos/);
});

test("três grupos exigem ao menos nove duplas para haver dois melhores terceiros", () => {
  assert.match(super12GroupSetupError(8, 3, "TOP_TWO_PLUS_BEST_THIRDS") ?? "", /ao menos 9 duplas/);
  assert.equal(super12GroupSetupError(9, 3, "TOP_TWO_PLUS_BEST_THIRDS"), null);
  assert.equal(super12GroupSetupError(12, 3, "TOP_TWO_PLUS_BEST_THIRDS"), null);
  assert.match(super12GroupSetupError(9, 4, "TOP_TWO_PLUS_BEST_THIRDS") ?? "", /3 grupos/);
});
