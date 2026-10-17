import assert from "node:assert/strict";
import test from "node:test";
import { financialEntryPermission } from "../src/lib/finance/entry-permissions";

test("permissões de lançamento são específicas do tipo e da operação", () => {
  for (const operation of ["create", "edit", "settle"] as const) {
    assert.equal(financialEntryPermission("REVENUE", operation), `finance:receivable:${operation}`);
    assert.equal(financialEntryPermission("EXPENSE", operation), `finance:payable:${operation}`);
  }
  assert.throws(() => financialEntryPermission("PAYABLE", "edit"), /Tipo de lançamento financeiro inválido/);
});
