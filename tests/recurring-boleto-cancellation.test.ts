import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("emissão automática e emissão individual ignoram recorrências canceladas", () => {
  const source = readFileSync(resolve(process.cwd(), "src/lib/payments/recurring-online-charges.ts"), "utf8");
  const eligibility = readFileSync(resolve(process.cwd(), "src/lib/payments/recurring-charge-eligibility.ts"), "utf8");
  assert.match(eligibility, /recurrence:\s*\{\s*active:\s*true,\s*onlinePaymentMethod:\s*"BOLETO"\s*\}/);
  assert.match(eligibility, /onlinePaymentClaimMethod: \{ in: \["", "BOLETO"\] \}/);
  assert.equal(source.match(/recurringBoletoEntryWhere\(/g)?.length, 2);
  assert.match(source, /recurrence:\s*\{\s*active:\s*true,\s*onlinePaymentMethod:\s*"BOLETO"\s*\}/);
});
