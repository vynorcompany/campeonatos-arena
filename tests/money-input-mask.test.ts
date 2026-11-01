import assert from "node:assert/strict";
import test from "node:test";
import { formatMaskedMoney, moneyDigitsToCents, pastedMoneyToCents } from "../src/lib/money-input-mask";
test("goal money fields format cents with grouping and understand pasted BRL amounts", () => {
  assert.equal(formatMaskedMoney(moneyDigitsToCents("150000")), "1.500,00");
  assert.equal(formatMaskedMoney(moneyDigitsToCents("1.500,00")), "1.500,00");
  for (const text of ["1500", "1.500", "1.500,00", "R$ 1.500,00"]) assert.equal(pastedMoneyToCents(text), 150000);
  assert.equal(pastedMoneyToCents("R$ 1.234,56"), 123456);
  assert.equal(pastedMoneyToCents("12.50"), 1250);
  assert.equal(pastedMoneyToCents("-12,50"), 0);
  assert.equal(pastedMoneyToCents(""), 0);
});
