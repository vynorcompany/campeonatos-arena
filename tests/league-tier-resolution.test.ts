import test from "node:test";
import assert from "node:assert/strict";
import { resolveLeagueTier } from "../src/lib/league/tier";

test("nome explícito de Liga B prevalece sobre configuração legada gravada como Liga A", () => {
  assert.equal(resolveLeagueTier("Liga Masculina B [Agosto]", "A"), "B");
});

test("nível configurado continua sendo usado quando o nome não define Liga A ou B", () => {
  assert.equal(resolveLeagueTier("Liga Masculina", "B"), "B");
});
