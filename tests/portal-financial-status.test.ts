import assert from "node:assert/strict";
import { test } from "node:test";
import { getPortalDueUrgency } from "../src/lib/portal/financial-status";

test("alerta laranja começa três dias antes e vermelho após vencer", () => {
  const today = new Date(2026, 9, 8);
  assert.equal(getPortalDueUrgency(new Date(2026, 9, 7), today), "overdue");
  assert.equal(getPortalDueUrgency(new Date(2026, 9, 8), today), "soon");
  assert.equal(getPortalDueUrgency(new Date(2026, 9, 11), today), "soon");
  assert.equal(getPortalDueUrgency(new Date(2026, 9, 12), today), "normal");
  assert.equal(getPortalDueUrgency(new Date(2026, 9, 20), today, "OVERDUE"), "overdue");
  assert.equal(getPortalDueUrgency(null, today), "normal");
});
