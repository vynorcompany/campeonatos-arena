import assert from "node:assert/strict";
import test from "node:test";
import { allocateComandaShares, equalComandaShares } from "../src/lib/comandas/split";

test("divisão conserva centavos inclusive em três partes", () => {
  assert.deepEqual(equalComandaShares(1000, 3), [334, 333, 333]);
  const parts = allocateComandaShares([{ playerId: "owner", amountCents: 334 }, { playerId: "a", amountCents: 333 }, { playerId: "b", amountCents: 333 }], 1000, 500, 100);
  assert.deepEqual(parts.map(part => part.outstandingCents), [0, 67, 333]);
  assert.equal(parts.reduce((sum, part) => sum + part.outstandingCents + part.paidCents + part.creditCents, 0), 1000);
});
test("crédito do titular não quita a parte de outra pessoa", () => {
  assert.throws(() => allocateComandaShares([{ playerId: "owner", amountCents: 500 }, { playerId: "a", amountCents: 500 }], 1000, 0, 600), /excedem/);
});
test("rejeita divisão duplicada, valores divergentes e pagamentos em excesso", () => {
  assert.throws(() => allocateComandaShares([{ playerId: "a", amountCents: 500 }, { playerId: "a", amountCents: 500 }], 1000, 0, 0), /única vez/);
  assert.throws(() => allocateComandaShares([{ playerId: "a", amountCents: 999 }], 1000, 0, 0), /soma/);
  assert.throws(() => allocateComandaShares([{ playerId: null, amountCents: 1000 }], 1000, 1001, 0), /excedem/);
});
