import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeCpf,
  normalizeDateInput,
  parseCategoryList,
  parseReaisToCents
} from "../src/lib/tournaments/inputs";

test("tournament input helpers normalize money and player identity values", () => {
  assert.equal(parseReaisToCents("R$ 1.234,56"), 123456);
  assert.equal(normalizeCpf("123.456.789-00"), "12345678900");
  assert.equal(normalizeDateInput("19/08/2026"), "2026-08-19");
});

test("tournament category parser preserves names and bounded configuration", () => {
  assert.deepEqual(parseCategoryList("A, B", 5000, 7000), [
    { name: "A", level: 1, groupCount: 4, pairsPerGroup: 3, priceSecondCents: 5000, priceThirdCents: 7000 },
    { name: "B", level: 2, groupCount: 4, pairsPerGroup: 3, priceSecondCents: 5000, priceThirdCents: 7000 }
  ]);
  assert.deepEqual(
    parseCategoryList('[{"name":"Avançado","groupCount":10,"pairsPerGroup":20,"priceSecondCents":"90,00"}]', 0, 0),
    [{ name: "Avançado", level: 1, groupCount: 8, pairsPerGroup: 16, priceSecondCents: 9000, priceThirdCents: 0 }]
  );
});

test("tournament input helpers retain existing invalid-value errors", () => {
  assert.throws(() => parseReaisToCents("-10"), /Valor monetário inválido/);
  assert.throws(() => parseCategoryList("", 0, 0), /Informe ao menos uma categoria/);
});
