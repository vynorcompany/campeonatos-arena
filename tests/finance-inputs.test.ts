import assert from "node:assert/strict";
import test from "node:test";

import {
  getReferenceMonthRange,
  parseDate,
  parseMoneyToCents
} from "../src/lib/finance/inputs";

test("finance input helpers preserve money and reference-month calculations", () => {
  assert.equal(parseMoneyToCents("1.234,56"), 123456);
  assert.equal(parseMoneyToCents(""), 0);

  const range = getReferenceMonthRange("2026-02");
  assert.deepEqual(
    [range.start.getFullYear(), range.start.getMonth(), range.start.getDate()],
    [2026, 1, 1]
  );
  assert.deepEqual(
    [range.end.getFullYear(), range.end.getMonth(), range.end.getDate()],
    [2026, 2, 1]
  );
  assert.equal(range.dueDate.getDate(), 28);
});

test("finance input helpers keep optional and invalid dates nullable", () => {
  assert.equal(parseDate(""), null);
  assert.equal(parseDate("invalid"), null);
  assert.equal(parseDate("2026-08-19")?.getFullYear(), 2026);
  assert.throws(() => parseMoneyToCents("-1"), /Valor inválido/);
});
