import assert from "node:assert/strict";
import test from "node:test";
import { calculatePlanTransfer, dateOnly, transferCycle } from "../src/lib/academy/plan-transfer-calculation";
const d = dateOnly;
test("troca e vencimento usam dias reais e produzem crédito em downgrade", () => {
  const base = { today: d("2026-11-15"), cycleStart: d("2026-11-01"), currentDueDate: d("2026-12-01"), newDueDate: d("2026-12-01"), oldPriceCents: 19900, newPriceCents: 21900 };
  assert.equal(calculatePlanTransfer(base).differenceCents, 1067);
  const extension = calculatePlanTransfer({ ...base, newDueDate: d("2026-12-06") });
  assert.equal(extension.dueDateDifferenceCents, 3650);
  assert.equal(extension.differenceCents, 4717);
  assert.equal(calculatePlanTransfer({ ...base, oldPriceCents: 21900, newPriceCents: 19900 }).differenceCents, -1067);
  assert.equal(calculatePlanTransfer({ ...base, newPriceCents: 0 }).differenceCents, -10613);
});
test("datas inexistentes, passado e janela excessiva são rejeitados; fevereiro e virada de ano corretos", () => {
  assert.throws(() => d("2027-02-29"));
  assert.equal(transferCycle(d("2028-02-29"), 31).end.toISOString().slice(0,10), "2028-03-31");
  assert.equal(transferCycle(d("2026-12-31"), 10).end.toISOString().slice(0,10), "2027-01-10");
  assert.throws(() => calculatePlanTransfer({ today:d("2026-11-15"), cycleStart:d("2026-11-01"), currentDueDate:d("2026-12-01"), newDueDate:d("2026-11-15"), oldPriceCents:19900,newPriceCents:21900 }));
});
