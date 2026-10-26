import assert from "node:assert/strict";
import test from "node:test";
import { auditFinancialOperation, auditSnapshotRows } from "../src/lib/audit/presentation";

test("audit distinguishes cancellation, deletion, bulk deletion and settlement without guessing legacy operations", () => {
  const action = "DB:UPDATE:FinancialEntry";
  const detail = (reason: string) => ({ before: { status: "PAID" }, after: { status: "VOIDED", voidReason: reason } });
  assert.equal(auditFinancialOperation(action, detail("Pedido duplicado")), "Lançamento estornado");
  assert.equal(auditFinancialOperation(action, detail("Excluído por Equipe em 26/10/2026.")), "Lançamento excluído");
  assert.equal(auditFinancialOperation(action, detail("Excluído em massa por Equipe em 26/10/2026.")), "Lançamento excluído");
  assert.match(auditFinancialOperation(action, { after: { status: "VOIDED" } })!, /estorno ou exclusão/);
  assert.equal(auditFinancialOperation(action, { before: { status: "PENDING" }, after: { status: "PAID" } }), "Lançamento quitado");
});
test("expanded audit only renders allowed changed fields and formats money without exposing payload secrets", () => {
  const rows = auditSnapshotRows({ changedFields: ["amountCents", "status", "password", "token", "unknown"], before: { amountCents: 1000, status: "PENDING", name: "Unchanged", password: "private" }, after: { amountCents: 1250, status: "PAID", name: "Unchanged", token: "secret", unknown: { password: "nested" } } });
  assert.deepEqual(rows.map(row => row.key), ["status", "amountCents"]);
  assert.equal(rows[0].before, "Em aberto"); assert.equal(rows[0].after, "Pago");
  assert.match(rows[1].after, /12,50/);
  assert.doesNotMatch(JSON.stringify(rows), /private|secret|nested|Unchanged/);
  assert.deepEqual(auditSnapshotRows({ before: null, after: [] }), []);
  assert.match(auditSnapshotRows({ after: { voidedAt: "2026-10-26T15:46:00" } })[0].after, /12:46/);
});
