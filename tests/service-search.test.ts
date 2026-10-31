import assert from "node:assert/strict";
import test from "node:test";
import { serviceMatchesSearch } from "../src/lib/calendar/service-search";

test("service search matches accented names without requiring case or accents", () => {
 assert.equal(serviceMatchesSearch("Locação de Raquetes", "LOCACAO"), true);
 assert.equal(serviceMatchesSearch("Lançador de Bolinhas", "lancador"), true);
 assert.equal(serviceMatchesSearch("Locação de Raquetes", "bolinhas"), false);
 assert.equal(serviceMatchesSearch("Aula", ""), true);
});
