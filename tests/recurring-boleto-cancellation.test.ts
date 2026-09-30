import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("emissão automática e emissão individual ignoram recorrências canceladas", () => {
  const source = readFileSync(resolve(process.cwd(), "src/lib/payments/recurring-online-charges.ts"), "utf8");
  assert.equal(source.match(/recurrence: \{ active: true, onlinePaymentMethod: "BOLETO" \}/g)?.length, 3);
});
