import assert from "node:assert/strict";
import test from "node:test";
import { agencyInvoiceDeadline } from "../src/lib/finance/agency-billing-dates";
import { teacherPlanCondition } from "../src/lib/finance/plan-filter";

test("prazo de regularização começa no vencimento e respeita os dias da agência", () => {
  const dueAt = new Date("2026-09-20T15:00:00.000Z");
  assert.equal(agencyInvoiceDeadline(dueAt, 0).toISOString(), dueAt.toISOString());
  assert.equal(agencyInvoiceDeadline(dueAt, 7).toISOString(), "2026-09-27T15:00:00.000Z");
});

test("todos os planos do professor inclui lançamento direto e mensalidade recorrente", () => {
  const condition = teacherPlanCondition("teacher-1");
  assert.deepEqual(condition.OR[0], { plan: { teacherAssignments: { some: { teacherId: "teacher-1", active: true } } } });
  assert.deepEqual(condition.OR[1], { recurrence: { plan: { teacherAssignments: { some: { teacherId: "teacher-1", active: true } } } } });
});
