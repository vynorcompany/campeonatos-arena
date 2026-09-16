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
  assert.deepEqual(parseCategoryList("A, B", 5000, 5000, 7000), [
    { name: "A", level: 1, groupCount: 4, pairsPerGroup: 3, priceFirstCents: 5000, priceSecondCents: 5000, priceThirdCents: 7000, standardKey: "", allowedRegistrationStandardKeys: [], maxRegistrations: 0, active: true },
    { name: "B", level: 2, groupCount: 4, pairsPerGroup: 3, priceFirstCents: 5000, priceSecondCents: 5000, priceThirdCents: 7000, standardKey: "", allowedRegistrationStandardKeys: [], maxRegistrations: 0, active: true }
  ]);
  assert.deepEqual(
    parseCategoryList('[{"name":"Avançado","groupCount":10,"pairsPerGroup":20,"priceSecondCents":"90,00"}]', 0, 0, 0),
    [{ name: "Avançado", level: 1, groupCount: 8, pairsPerGroup: 16, priceFirstCents: 0, priceSecondCents: 9000, priceThirdCents: 0, standardKey: "", allowedRegistrationStandardKeys: [], maxRegistrations: 0, active: true }]
  );
  assert.deepEqual(
    parseCategoryList('[{"name":"5ª Masc","standardKey":"5ª Masculina","allowedRegistrationStandardKeys":["6ª Masculina"],"maxRegistrations":24}]', 0, 0, 0)[0],
    { name: "5ª Masc", level: 1, groupCount: 4, pairsPerGroup: 3, priceFirstCents: 0, priceSecondCents: 0, priceThirdCents: 0, standardKey: "5ª Masculina", allowedRegistrationStandardKeys: ["6ª Masculina"], maxRegistrations: 24, active: true }
  );
});

test("tournament input helpers retain existing invalid-value errors", () => {
  assert.throws(() => parseReaisToCents("-10"), /Valor monetário inválido/);
  assert.throws(() => parseCategoryList("", 0, 0, 0), /Informe ao menos uma categoria/);
});
