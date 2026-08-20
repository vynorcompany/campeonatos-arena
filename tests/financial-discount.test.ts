import assert from "node:assert/strict";
import test from "node:test";
import { getDiscountedAmountCents } from "@/lib/finance/discounts";

test("aplica desconto financeiro em reais ou percentual sem gerar valor negativo", () => {
  assert.equal(getDiscountedAmountCents(12000, 1500, "AMOUNT"), 10500);
  assert.equal(getDiscountedAmountCents(12000, 12.5, "PERCENTAGE"), 10500);
  assert.equal(getDiscountedAmountCents(12000, 15000, "AMOUNT"), 0);
});
