import { fiscalCatalogDate } from "../src/lib/fiscal/catalog-date";
import test from "node:test";
import assert from "node:assert/strict";
import {
  fiscalProfileIssues,
  fiscalProfilePending,
  isValidGtin,
  productFiscalProfileSchema,
  readProductFiscalProfile,
} from "../src/lib/fiscal/product-profile";
import {
  findNcm,
  ncmIsCurrent,
  searchNcm,
} from "../src/lib/fiscal/ncm-catalog";
import {
  findRtc,
  findPrBenefit,
  searchRtc,
} from "../src/lib/fiscal/product-profile-service";
const issuer = { issuerState: "PR", crt: "1" };
const profile = (value: object) => productFiscalProfileSchema.parse(value);
test("fiscal: cadastro vazio é rascunho e não atribui tributação automaticamente", () => {
  const empty = readProductFiscalProfile({});
  assert.equal(empty.ncm, "");
  assert.equal(empty.icmsCode, "");
  assert.equal(empty.ibsUfRate, "");
  assert.ok(fiscalProfilePending(empty, {}).includes("Regime do emitente"));
  assert.deepEqual(fiscalProfileIssues(empty, issuer), []);
});
test("fiscal: distingue CSOSN do Simples e CST do regime normal", () => {
  assert.deepEqual(
    fiscalProfileIssues(profile({ icmsCode: "102", cfop: "5102" }), issuer),
    [],
  );
  assert.match(
    fiscalProfileIssues(profile({ icmsCode: "00" }), issuer).join(" "),
    /CSOSN/,
  );
  assert.match(
    fiscalProfileIssues(profile({ icmsCode: "102" }), { crt: "3" }).join(" "),
    /CST/,
  );
  assert.deepEqual(
    fiscalProfileIssues(profile({ icmsCode: "00", cfop: "5102" }), {
      crt: "3",
    }),
    [],
  );
  assert.match(
    fiscalProfileIssues(profile({ icmsCode: "101" }), issuer).join(" "),
    /NFC-e/,
  );
});
test("fiscal: CFOP de ST não pode ser combinado com CSOSN de tributação comum", () => {
  assert.deepEqual(
    fiscalProfileIssues(profile({ icmsCode: "500", cfop: "5405" }), issuer),
    [],
  );
  assert.match(
    fiscalProfileIssues(
      profile({ icmsCode: "500", cfop: "5102" }),
      issuer,
    ).join(" "),
    /incompatível/,
  );
  assert.match(
    fiscalProfileIssues(
      profile({ icmsCode: "102", cfop: "5405" }),
      issuer,
    ).join(" "),
    /incompatível/,
  );
  assert.equal(
    productFiscalProfileSchema.safeParse({ cfop: "6102" }).success,
    false,
  );
});
test("fiscal: valida GTIN e seu dígito verificador, sem inventar código de barras", () => {
  assert.ok(isValidGtin("7894900011517"));
  assert.equal(isValidGtin("7894900011518"), false);
  assert.equal(isValidGtin("00000000"), false);
  assert.ok(isValidGtin("SEM GTIN"));
  assert.equal(profile({ gtin: "sem gtin" }).gtin, "SEM GTIN");
  assert.match(
    fiscalProfileIssues(profile({ gtin: "7894900011518" }), issuer).join(" "),
    /GTIN comercial/,
  );
});
test("fiscal: percentuais usam vírgula e rejeitam negativos, excesso e fator zero", () => {
  assert.equal(profile({ pisRate: "1,65" }).pisRate, "1.65");
  for (const value of ["-1", "101", "1.23456", "NaN"])
    assert.equal(
      productFiscalProfileSchema.safeParse({ icmsRate: value }).success,
      false,
    );
  assert.equal(
    productFiscalProfileSchema.safeParse({ tributaryFactor: "0" }).success,
    false,
  );
  assert.equal(
    profile({ tributaryFactor: "1000,125" }).tributaryFactor,
    "1000.125",
  );
});
test("fiscal: não aceita alíquota positiva para revenda monofásica ou isenta", () => {
  assert.match(
    fiscalProfileIssues(
      profile({ pisCst: "04", pisRate: "1.65" }),
      issuer,
    ).join(" "),
    /não admite/,
  );
  assert.deepEqual(
    fiscalProfileIssues(profile({ pisCst: "04", pisRate: "0" }), issuer),
    [],
  );
  assert.match(
    fiscalProfileIssues(
      profile({ cofinsCst: "03", cofinsRate: "7.6" }),
      issuer,
    ).join(" "),
    /por unidade/,
  );
  assert.deepEqual(
    fiscalProfileIssues(
      profile({ pisCst: "03", pisUnitRate: "0.1234" }),
      issuer,
    ),
    [],
  );
});
test("fiscal: cBenef segue a UF, e IBS/CBS exige CST/classificação correspondentes", () => {
  assert.match(
    fiscalProfileIssues(profile({ benefitCode: "SC800000" }), issuer).join(" "),
    /UF/,
  );
  assert.deepEqual(
    fiscalProfileIssues(profile({ benefitCode: "PR800000" }), issuer),
    [],
  );
  assert.match(
    fiscalProfileIssues(profile({ ibsCbsCst: "000" }), issuer).join(" "),
    /conjunto/,
  );
  assert.match(
    fiscalProfileIssues(
      profile({ ibsCbsCst: "200", cClassTrib: "000001" }),
      issuer,
    ).join(" "),
    /corresponder/,
  );
  assert.deepEqual(
    fiscalProfileIssues(
      profile({ ibsCbsCst: "000", cClassTrib: "000001" }),
      issuer,
    ),
    [],
  );
});
test("fiscal: consulta NCM oficial vigente sem enviar catálogo inteiro ao cliente", () => {
  assert.ok(findNcm("22021000"));
  assert.equal(findNcm("99999999"), undefined);
  assert.ok(searchNcm("bebida").length);
  assert.ok(searchNcm("22").length <= 12);
  assert.equal(searchNcm("").length, 0);
  assert.equal(
    ncmIsCurrent(
      { code: "99999999", label: "QA", start: "01/01/2030", end: "31/12/9999" },
      "2026-10-29",
    ),
    false,
  );
  assert.equal(
    ncmIsCurrent(
      { code: "99999999", label: "QA", start: "01/01/2000", end: "31/12/2020" },
      "2026-10-29",
    ),
    false,
  );
});
test("fiscal: classificação IBS/CBS precisa existir, estar vigente e permitir NFC-e", () => {
  assert.equal(findRtc("000001")?.cst, "000");
  assert.equal(findRtc("999999"), undefined);
  assert.equal(findRtc("000001", "2000-01-01"), undefined);
  assert.ok(searchRtc("tributadas").every((row) => findRtc(row.code)));
  assert.ok(searchRtc("200").length <= 12);
});

test("fiscal: tabela PR distingue benefícios publicados, vencidos e CST compatíveis", () => {
  assert.ok(findPrBenefit("PR800000")?.csts.includes("41"));
  assert.equal(findPrBenefit("PR820059"), undefined);
  assert.equal(findPrBenefit("PR999999"), undefined);
  assert.equal(findPrBenefit("PR800000", "2010-01-01"), undefined);
});
test("fiscal: MEI usa os CSOSN de NFC-e permitidos, e isenção não recebe ICMS próprio", () => {
  assert.match(
    fiscalProfileIssues(profile({ icmsCode: "500" }), { crt: "4" }).join(" "),
    /CSOSN/,
  );
  assert.deepEqual(
    fiscalProfileIssues(profile({ icmsCode: "102" }), { crt: "4" }),
    [],
  );
  assert.match(
    fiscalProfileIssues(
      profile({ icmsCode: "102", icmsRate: "18" }),
      issuer,
    ).join(" "),
    /ICMS próprio/,
  );
});

test("fiscal: vigência usa a data do Paraná na virada do dia UTC", () => {
  assert.equal(
    fiscalCatalogDate(new Date("2026-10-30T01:00:00Z")),
    "2026-10-29",
  );
});
