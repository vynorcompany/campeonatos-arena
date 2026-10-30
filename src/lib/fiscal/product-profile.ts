import { z } from "zod";
export class ProductFiscalValidationError extends Error {}
export const UF_OPTIONS =
  "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(
    " ",
  );
export const CRT_OPTIONS = [
  ["1", "Simples Nacional"],
  ["2", "Simples Nacional · excesso de sublimite"],
  ["3", "Regime normal"],
  ["4", "MEI"],
] as const;
export const CSOSN_OPTIONS = [
  ["102", "Tributada sem permissão de crédito"],
  ["103", "Isenção por faixa de receita"],
  ["300", "Imune"],
  ["400", "Não tributada pelo Simples Nacional"],
  ["500", "ICMS cobrado anteriormente por ST/antecipação"],
  ["900", "Outros"],
] as const;
export const meiCsosnOptions = () =>
  CSOSN_OPTIONS.filter(([code]) => ["102", "300"].includes(code));
export const CST_OPTIONS = [
  ["00", "Tributada integralmente"],
  ["20", "Redução de base de cálculo"],
  ["40", "Isenta"],
  ["41", "Não tributada"],
  ["60", "ICMS cobrado anteriormente por ST"],
  ["90", "Outros"],
] as const;
export const CONTRIBUTION_CST_OPTIONS = [
  ["01", "Tributável · alíquota básica"],
  ["02", "Tributável · alíquota diferenciada"],
  ["03", "Tributável por unidade"],
  ["04", "Monofásica · revenda a alíquota zero"],
  ["05", "Substituição tributária"],
  ["06", "Alíquota zero"],
  ["07", "Isenta"],
  ["08", "Sem incidência"],
  ["09", "Suspensão"],
  ["49", "Outras saídas"],
  ["99", "Outras operações"],
] as const;
const text = (max = 100) =>
  z.string().trim().max(max, `Use até ${max} caracteres.`).default("");
const code = (pattern: RegExp, message: string) =>
  text(20).refine((value) => !value || pattern.test(value), message);
const decimal = (max: number, scale = 4) =>
  text(30)
    .transform((value) => value.replace(",", "."))
    .refine(
      (value) =>
        !value ||
        (new RegExp(`^\\d{1,7}(?:\\.\\d{1,${scale}})?$`).test(value) &&
          Number(value) <= max),
      "Informe um valor decimal válido.",
    );
export const productFiscalProfileSchema = z
  .object({
    ncm: code(/^\d{8}$/, "NCM deve ter 8 dígitos."),
    cest: code(/^\d{7}$/, "CEST deve ter 7 dígitos."),
    origin: code(/^[0-8]$/, "Origem inválida."),
    gtin: text(14).transform((value) => value.toUpperCase()),
    gtinTrib: text(14).transform((value) => value.toUpperCase()),
    commercialUnit: code(/^[A-Za-z0-9]{1,6}$/, "Unidade comercial inválida."),
    tributaryUnit: code(/^[A-Za-z0-9]{1,6}$/, "Unidade tributável inválida."),
    tributaryFactor: decimal(9999999, 6).refine(
      (value) => !value || Number(value) > 0,
      "O fator tributável deve ser maior que zero.",
    ),
    cfop: code(
      /^5\d{3}$/,
      "Para a NFC-e, informe o CFOP da operação interna (5xxx).",
    ),
    icmsCode: code(/^\d{2,3}$/, "CST/CSOSN inválido."),
    icmsRate: decimal(100),
    icmsReduction: decimal(100),
    fcpRate: decimal(100),
    benefitCode: text(10)
      .transform((value) => value.toUpperCase())
      .refine(
        (value) => !value || /^(?:[A-Z]{2}\d{6}|SEM CBENEF)$/.test(value),
        "Código de benefício fiscal inválido.",
      ),
    pisCst: code(/^\d{2}$/, "CST do PIS inválido."),
    pisRate: decimal(100),
    pisUnitRate: decimal(9999999),
    cofinsCst: code(/^\d{2}$/, "CST da Cofins inválido."),
    cofinsRate: decimal(100),
    cofinsUnitRate: decimal(9999999),
    ibsCbsCst: code(/^\d{3}$/, "CST IBS/CBS deve ter 3 dígitos."),
    cClassTrib: code(/^\d{6}$/, "cClassTrib deve ter 6 dígitos."),
    ibsUfRate: decimal(100),
    ibsMunicipalRate: decimal(100),
    cbsRate: decimal(100),
    additionalInfo: text(500),
  })
  .strict();
export type ProductFiscalProfile = z.infer<typeof productFiscalProfileSchema>;
export type FiscalIssuer = { crt?: string; issuerState?: string };
export function isValidGtin(value: string) {
  if (!value || value === "SEM GTIN") return true;
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value) || /^0+$/.test(value))
    return false;
  const digits = value.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((sum, digit, index) => sum + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
export function fiscalProfileIssues(
  profile: ProductFiscalProfile,
  issuer: FiscalIssuer,
) {
  const issues: string[] = [];
  const simple = ["1", "4"].includes(issuer.crt ?? "");
  for (const [label, value] of [
    ["GTIN comercial", profile.gtin],
    ["GTIN tributável", profile.gtinTrib],
  ])
    if (!isValidGtin(value))
      issues.push(`${label} inválido; confira os dígitos ou informe SEM GTIN.`);
  if (profile.icmsCode && issuer.crt) {
    const options =
      issuer.crt === "4"
        ? meiCsosnOptions()
        : simple
          ? CSOSN_OPTIONS
          : CST_OPTIONS;
    if (!options.some(([code]) => code === profile.icmsCode))
      issues.push(
        `Selecione um ${simple ? "CSOSN" : "CST"} compatível com o regime do emitente e a NFC-e.`,
      );
  }
  if (
    profile.icmsCode &&
    !["00", "20", "90", "900"].includes(profile.icmsCode) &&
    [profile.icmsRate, profile.icmsReduction, profile.fcpRate].some(
      (value) => value && Number(value) > 0,
    )
  )
    issues.push(
      "O CST/CSOSN informado não admite os percentuais de ICMS próprio preenchidos.",
    );
  if (
    profile.icmsReduction &&
    Number(profile.icmsReduction) > 0 &&
    !["20", "90", "900"].includes(profile.icmsCode)
  )
    issues.push("A redução da base não corresponde ao CST/CSOSN informado.");
  const regular = ["5101", "5102", "5103", "5104", "5115"],
    st = ["5405", "5656", "5667"];
  if (profile.cfop && ![...regular, ...st].includes(profile.cfop))
    issues.push(
      "CFOP fora das operações de venda contempladas neste cadastro de NFC-e.",
    );
  if (profile.cfop && profile.icmsCode && issuer.crt) {
    const previous = simple
      ? profile.icmsCode === "500"
      : profile.icmsCode === "60";
    if (!(previous ? st : regular).includes(profile.cfop))
      issues.push("CFOP incompatível com o CST/CSOSN informado.");
  }
  if (
    profile.benefitCode &&
    profile.benefitCode !== "SEM CBENEF" &&
    issuer.issuerState &&
    !profile.benefitCode.startsWith(issuer.issuerState)
  )
    issues.push("O benefício fiscal deve pertencer à UF do emitente.");
  for (const [name, cst, rate, unitRate] of [
    ["PIS", profile.pisCst, profile.pisRate, profile.pisUnitRate],
    ["Cofins", profile.cofinsCst, profile.cofinsRate, profile.cofinsUnitRate],
  ]) {
    if (cst && !CONTRIBUTION_CST_OPTIONS.some(([code]) => code === cst))
      issues.push(`CST de ${name} inválido para saída.`);
    if (
      ["04", "05", "06", "07", "08", "09"].includes(cst) &&
      ((rate && Number(rate) > 0) || (unitRate && Number(unitRate) > 0))
    )
      issues.push(
        `O CST de ${name} informado não admite alíquota positiva de saída.`,
      );
    if (rate && unitRate)
      issues.push(
        `Informe alíquota percentual ou por unidade para ${name}, conforme o CST.`,
      );
    if (cst === "03" && rate)
      issues.push(
        `Para ${name} por unidade, use a alíquota em reais por unidade.`,
      );
  }
  if (Boolean(profile.ibsCbsCst) !== Boolean(profile.cClassTrib))
    issues.push("Preencha CST e cClassTrib de IBS/CBS em conjunto.");
  if (
    profile.ibsCbsCst &&
    profile.cClassTrib &&
    !profile.cClassTrib.startsWith(profile.ibsCbsCst)
  )
    issues.push("O cClassTrib deve corresponder ao CST de IBS/CBS.");
  return issues;
}
export function fiscalProfilePending(
  profile: ProductFiscalProfile,
  issuer: FiscalIssuer,
) {
  return [
    ...(!issuer.crt ? ["Regime do emitente"] : []),
    ...(!issuer.issuerState ? ["UF do emitente"] : []),
    ...Object.entries({
      NCM: profile.ncm,
      Origem: profile.origin,
      CFOP: profile.cfop,
      "CST/CSOSN": profile.icmsCode,
      "Unidade comercial": profile.commercialUnit,
      "Unidade tributável": profile.tributaryUnit,
      "Fator tributável": profile.tributaryFactor,
      "GTIN comercial": profile.gtin,
      "GTIN tributável": profile.gtinTrib,
      "CST PIS": profile.pisCst,
      "CST Cofins": profile.cofinsCst,
    })
      .filter(([, value]) => !value)
      .map(([name]) => name),
  ];
}
export const readProductFiscalProfile = (
  value: unknown,
): ProductFiscalProfile =>
  productFiscalProfileSchema.parse(
    value && typeof value === "object" ? value : {},
  );
