import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("emissão automática e emissão individual ignoram recorrências canceladas", () => {
  const source = readFileSync(resolve(process.cwd(), "src/lib/payments/recurring-online-charges.ts"), "utf8");
  const eligibility = readFileSync(resolve(process.cwd(), "src/lib/payments/recurring-charge-eligibility.ts"), "utf8");
  assert.match(eligibility, /recurrence: \{ active: true, onlinePaymentMethod: "BOLETO" \}/);
  assert.match(eligibility, /onlinePaymentClaimMethod: \{ in: \["", "BOLETO"\] \}/);
  assert.equal(source.match(/recurringBoletoEntryWhere\(/g)?.length, 2);
  assert.match(source, /recurrence: \{ active: true, onlinePaymentMethod: "BOLETO" \}/);
});
