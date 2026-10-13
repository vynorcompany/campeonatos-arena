import assert from "node:assert/strict";
import test from "node:test";
import { searchAthleteOptions } from "../src/lib/tournament-category/athlete-search";

test("busca da inscrição lista todos os atletas elegíveis, não apenas os oito primeiros", () => {
  const athletes = Array.from({ length: 12 }, (_, index) => ({ id: `player-${index}`, name: `Atleta ${index + 1}` }));
  assert.equal(searchAthleteOptions(athletes, "").length, 12);
  assert.equal(searchAthleteOptions(athletes, "Atleta 12")[0]?.id, "player-11");
  assert.equal(searchAthleteOptions(athletes, "", "player-11").length, 11);
});

test("busca de atleta ignora acentos e diferença de maiúsculas", () => {
  const athletes = [{ id: "a", name: "João Vítor" }, { id: "b", name: "Maria" }];
  assert.deepEqual(searchAthleteOptions(athletes, "JOAO VITOR"), [athletes[0]]);
});
