import type { PayrollAmounts } from "./employee-payroll";
export type PayslipDraft = { employeeName: string; referenceMonth: string; amounts: PayrollAmounts; grossCents: number; netCents: number; warnings: string[] };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const moneyValues = (value: string) => [...value.matchAll(/(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}/g)].map(match => Number(match[0].replace(/\D/g, "")));
/** Reads labelled totals only. Never infer taxable bases or deductions from arbitrary numbers. */
export function parsePayslipText(text: string): PayslipDraft {
  if (!text.trim() || text.length > 120_000) throw new Error("Holerite sem texto legível ou muito extenso. Envie um PDF com texto selecionável ou um arquivo TXT.");
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  function amount(pattern: RegExp) {
    const found = new Set<number>();
    for (let i = 0; i < lines.length; i++) {
      const line = normalize(lines[i]);
      if (!pattern.test(line)) continue;
      const same = moneyValues(line);
      if (same.length && !/total.*(?:vencimentos|proventos).*total.*descontos/.test(line)) { found.add(same.at(-1)!); continue; }
      const labels = [...line.matchAll(/total\s*(?:de\s*)?(?:vencimentos|proventos|descontos)|(?:valor\s*)?liquido(?:\s*a\s*receber)?/g)];
      const index = labels.findIndex(label => pattern.test(label[0]));
      const values = same.length ? same : moneyValues(lines[i + 1] ?? "");
      if (labels.length > 1 && index >= 0 && values.length === labels.length) found.add(values[index]);
      else if (values.length === 1) found.add(values[0]);
    }
    if (found.size > 1) throw new Error("O arquivo contém valores divergentes. Importe um holerite por vez.");
    return [...found][0];
  }
  let grossCents = amount(/total\s*(?:de\s*)?(?:vencimentos|proventos)/);
  const discountCents = amount(/total\s*(?:de\s*)?descontos/);
  const netCents = amount(/(?:valor\s*)?liquido(?:\s*a\s*receber)?/);
  if (grossCents === undefined && netCents !== undefined && discountCents !== undefined) grossCents = netCents + discountCents;
  if (grossCents === undefined || discountCents === undefined || netCents === undefined) throw new Error("Não identifiquei os totais de proventos, descontos e líquido. Envie um holerite com esses totais legíveis.");
  if (grossCents - discountCents !== netCents || netCents <= 0 || grossCents > 2_000_000_000) throw new Error("Os totais do holerite não conferem. Revise proventos, descontos e líquido antes de importar.");
  const base = amount(/salario\s*(?:base|mensal)|(?:^|\s)salario\s*normal/);
  const fixedSalaryCents = base !== undefined && base <= grossCents ? base : 0;
  const normalized = normalize(text);
  const numericMonth = normalized.match(/(?:competencia|referencia|mes)\s*[:\-]?\s*(0?[1-9]|1[0-2])[\/-](20\d{2})/);
  const namedMonth = normalized.match(/(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)[\s\/-]+(20\d{2})/);
  const monthNames = ["janeiro","fevereiro","marco","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const referenceMonth = numericMonth ? `${numericMonth[2]}-${numericMonth[1].padStart(2,"0")}` : namedMonth ? `${namedMonth[2]}-${String(monthNames.indexOf(namedMonth[1])+1).padStart(2,"0")}` : "";
  const employeeNames = [...new Set(lines.filter(line => /^(?:nome(?:\s+do\s+(?:funcionario|empregado|colaborador))?|funcionario|empregado|colaborador)\s*[:\-]/i.test(normalize(line))).map(line => line.replace(/^[^:\-]+[:\-]\s*/, "").trim()).filter(Boolean))];
  if (employeeNames.length > 1) throw new Error("O arquivo contém mais de um funcionário. Importe um holerite por vez.");
  const employeeName = employeeNames[0]?.slice(0, 150) ?? "";
  return { employeeName, referenceMonth, grossCents, netCents, amounts: { fixedSalaryCents, monthlyMinutes: 13200, overtimeMinutes: 0, overtimePercentage: 50, nightMinutes: 0, nightOvertimeMinutes: 0, nightPercentage: 20, nightHourMinutes: 52.5, bonusCents: grossCents - fixedSalaryCents, benefitsCents: 0, discountCents, advanceCents: 0 }, warnings: ["Proventos além do salário base foram agrupados em adicionais; descontos já incluem os valores do holerite. Não os lance novamente.", ...(!fixedSalaryCents ? ["Salário base não identificado: os proventos foram agrupados em adicionais. Confira a distribuição."] : []), ...(!referenceMonth ? ["Selecione o mês de referência."] : [])] };
}
