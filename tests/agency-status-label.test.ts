import assert from "node:assert/strict";
import test from "node:test";
import { agencyStatusLabel } from "../src/lib/agency/status-label";

test("agency displays account and subscription states in Portuguese", () => {
  assert.equal(agencyStatusLabel("ACTIVE"), "Ativa");
  assert.equal(agencyStatusLabel("PAUSED"), "Pausada");
  assert.equal(agencyStatusLabel("CANCELED"), "Cancelada");
  assert.equal(agencyStatusLabel("EXPIRED"), "Expirada");
  assert.equal(agencyStatusLabel("UNKNOWN"), "UNKNOWN");
});
