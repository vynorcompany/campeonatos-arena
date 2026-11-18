import assert from "node:assert/strict";
import { test } from "node:test";
import { getPortalDueUrgency } from "../src/lib/portal/financial-status";

test("alerta laranja começa três dias antes e vermelho após vencer", () => {
  const today = new Date(2026, 9, 8);
  assert.equal(getPortalDueUrgency(new Date(2026, 9, 7), today), "overdue");
  assert.equal(getPortalDueUrgency(new Date(2026, 9, 8), today), "soon");
  assert.equal(getPortalDueUrgency(new Date(2026, 9, 11), today), "soon");
  assert.equal(getPortalDueUrgency(new Date(2026, 9, 12), today), "normal");
  assert.equal(getPortalDueUrgency(new Date(2026, 9, 20), today, "OVERDUE"), "normal");
  assert.equal(getPortalDueUrgency(null, today), "normal");
});


test("a cobrança só fica atrasada no próximo dia, mesmo com status antigo ou hora no vencimento", () => {
  const due = new Date(2026, 10, 18, 0, 0);
  assert.equal(getPortalDueUrgency(due, new Date(2026, 10, 18, 23, 59), "OVERDUE"), "soon");
  assert.equal(getPortalDueUrgency(due, new Date(2026, 10, 19, 0, 0)), "overdue");
  assert.equal(getPortalDueUrgency(new Date(2026, 10, 18, 23, 59), new Date(2026, 10, 18, 12)), "soon");
  assert.equal(getPortalDueUrgency(null, new Date(2026, 10, 18), "OVERDUE"), "normal");
});
