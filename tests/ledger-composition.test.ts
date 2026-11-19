import test from "node:test";
import assert from "node:assert/strict";
import { creationComposition, revisedLedgerOriginal, getLedgerComposition, installmentCompositions, sumLedgerCompositions } from "../src/lib/finance/ledger-composition";
import { entryAdjustedAmount } from "../src/lib/finance/entry-adjustments";

const entry = { amountCents: 10500, source: "MANUAL", ...creationComposition(entryAdjustedAmount("100", "5", "AMOUNT", "10")) };
test("creation and settlement adjustments are counted once, independently of payments and status", () => {
  for (const status of ["PENDING", "PARTIAL", "PAID"]) {
    const value = getLedgerComposition({ ...entry, status, settlements: [{ amountCents: 4000, interestCents: 200, discountCents: 100 }] });
    assert.deepEqual(value, { originalCents: 10000, interestCents: 1200, discountCents: 600, adjustedCents: 10600, creationKnown: true });
    assert.equal(value.originalCents + value.interestCents - value.discountCents, value.adjustedCents);
  }
});
test("legacy or stale manual composition uses the recorded base without inventing original adjustments", () => {
  for (const value of [{ amountCents: 10500, source: "MANUAL" }, { ...entry, amountCents: 12000 }]) {
    const result = getLedgerComposition({ ...value, settlements: [{ interestCents: 200, discountCents: 100 }] });
    assert.equal(result.creationKnown, false);
    assert.equal(result.originalCents, value.amountCents);
    assert.equal(result.adjustedCents, value.amountCents + 100);
    assert.equal(sumLedgerCompositions([value]).unknownCount, 1);
  }
});
test("discount-only, zero adjustments and zero total remain discriminated", () => {
  for (const [discount, interest] of [["5", "0"], ["0", "0"], ["100", "0"]]) {
    const adjustment = entryAdjustedAmount("100", discount, "AMOUNT", interest);
    const result = getLedgerComposition({ amountCents: adjustment.amountCents, source: "MANUAL", ...creationComposition(adjustment) });
    assert.equal(result.creationKnown, true);
    assert.equal(result.originalCents, 10000);
    assert.equal(result.discountCents, Number(discount) * 100);
    assert.equal(result.adjustedCents, adjustment.amountCents);
  }
});
test("selected totals preserve their composition and exclude voided or agency-only entries", () => {
  const total = sumLedgerCompositions([entry, entry, { ...entry, status: "VOIDED" }, { ...entry, source: "AGENCY_SUBSCRIPTION" }]);
  assert.deepEqual(total, { originalCents: 20000, interestCents: 2000, discountCents: 1000, adjustedCents: 21000, unknownCount: 0 });
  assert.deepEqual(sumLedgerCompositions([]), { originalCents: 0, interestCents: 0, discountCents: 0, adjustedCents: 0, unknownCount: 0 });
});
test("uneven custom installments preserve each component to the cent without multiplying interest", () => {
  for (const amounts of [[3500, 3500, 3500], [1, 2499, 8000], [5000, 5500]]) {
    const composition = installmentCompositions(entry, amounts);
    const rows = amounts.map((amountCents, index) => ({ amountCents, source: "MANUAL", ...composition[index] }));
    assert.deepEqual(sumLedgerCompositions(rows), sumLedgerCompositions([entry]));
    for (const row of rows) assert.equal(getLedgerComposition(row).creationKnown, true);
  }
  assert.ok(installmentCompositions({ amountCents: 100, source: "MANUAL" }, [50, 50]).every(row => row.originalAmountCents === null));
});

test("editing original value preserves creation adjustments without reapplying settlement adjustments", () => {
  assert.deepEqual(revisedLedgerOriginal(entry, 10000), { amountCents: 10500, originalAmountCents: 10000 });
  assert.deepEqual(revisedLedgerOriginal({ ...entry, settlements: [{ interestCents: 200, discountCents: 100 }] }, 11000), { amountCents: 11500, originalAmountCents: 11000 });
  assert.deepEqual(revisedLedgerOriginal({ amountCents: 10000, source: "MANUAL" }, 11000), { amountCents: 11000 });
  assert.throws(() => revisedLedgerOriginal(entry, 100), /desconto/);
});
