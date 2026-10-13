import assert from "node:assert/strict";
import test from "node:test";
import { buildCategoryBracketSeeds, hasStartedCategoryBracket } from "@/lib/tournament/bracket";

test("bracket seeds use the next power of two and preserve byes", () => {
  assert.deepEqual(buildCategoryBracketSeeds(["a", "b", "c"]), [{ home: "a", away: null }, { home: "b", away: "c" }]);
});

test("a bracket needs at least two confirmed registrations", () => {
  assert.throws(() => buildCategoryBracketSeeds(["a"]), /ao menos 2 inscrições/);
});

test("chave não pode ser remontada depois de agendar ou iniciar um jogo", () => {
  const waiting = { scheduledTime: "", courtName: "", status: "WAITING", winnerRegistrationId: null };
  assert.equal(hasStartedCategoryBracket([waiting]), false);
  assert.equal(hasStartedCategoryBracket([{ ...waiting, scheduledTime: "19:00" }]), true);
  assert.equal(hasStartedCategoryBracket([{ ...waiting, courtName: "Quadra 1" }]), true);
  assert.equal(hasStartedCategoryBracket([{ ...waiting, status: "FINISHED" }]), true);
  assert.equal(hasStartedCategoryBracket([{ ...waiting, winnerRegistrationId: "inscricao-1" }]), true);
});
