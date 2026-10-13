import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hasExistingOnlineCharge } from "../src/lib/payments/existing-online-charge";

test("cobrança identificada por ID ou URL não pode ser emitida novamente", () => {
  assert.equal(hasExistingOnlineCharge({ onlinePaymentId: "", onlinePaymentUrl: "" }), false);
  assert.equal(hasExistingOnlineCharge({ onlinePaymentId: "payment-1", onlinePaymentUrl: "" }), true);
  assert.equal(hasExistingOnlineCharge({ onlinePaymentId: "", onlinePaymentUrl: "https://example.test/pay" }), true);
});

test("a ação financeira consulta a cobrança existente antes de chamar o provedor", () => {
  const source = readFileSync(new URL("../src/lib/actions/finance.ts", import.meta.url), "utf8");
  const action = source.slice(source.indexOf("export async function generateFinancialEntryOnlineChargeAction"), source.indexOf("export async function settleFinancialEntryAction"));
  assert.ok(action.indexOf("hasExistingOnlineCharge(entry)") > 0);
  assert.ok(action.indexOf("hasExistingOnlineCharge(entry)") < action.indexOf("createBoletoPayment("));
});
