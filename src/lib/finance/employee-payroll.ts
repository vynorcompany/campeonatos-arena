import { z } from "zod";
import { parseMoneyToCents } from "./inputs";

const money = z.string().trim().default("0").refine(value => {
  if (!/^(?:R\$\s*)?\d[\d.,\s]*$/.test(value || "0")) return false;
  try { const cents = parseMoneyToCents(value); return Number.isSafeInteger(cents) && cents <= 2_000_000_000; } catch { return false; }
}, "Informe um valor monetário válido.").transform(parseMoneyToCents);
const hours = z.string().trim().transform(value => Number(value.replace(",", "."))).pipe(z.number().finite().min(0).max(744)).transform(value => Math.round(value * 60));
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.").refine(value => {
  const parsed = new Date(value + "T12:00:00Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Informe uma data válida.");

export const employeePayrollSchema = z.object({
  userId: z.string().min(1, "Selecione um funcionário."),
  referenceMonth: z.string().regex(/^(?:20|21)\d{2}-(?:0[1-9]|1[0-2])$/, "Informe um mês válido."),
  fixedSalary: money,
  monthlyHours: hours.pipe(z.number().positive("Informe a jornada mensal.")),
  overtimeHours: hours,
  overtimePercentage: z.coerce.number().int().min(0).max(300),
  bonus: money,
  benefits: money,
  discount: money,
  advance: money,
  status: z.enum(["PENDING", "PAID"]),
  dueDate: date,
  paidAt: z.union([date, z.literal("")]).default(""),
  notes: z.string().trim().max(2000).default(""),
}).refine(value => value.status !== "PAID" || Boolean(value.paidAt), { message: "Informe a data do pagamento.", path: ["paidAt"] });

export type EmployeePayrollInput = z.infer<typeof employeePayrollSchema>;
export type PayrollAmounts = { fixedSalaryCents: number; monthlyMinutes: number; overtimeMinutes: number; overtimePercentage: number; bonusCents: number; benefitsCents: number; discountCents: number; advanceCents: number };

export function calculateEmployeePayroll(values: PayrollAmounts) {
  const overtimeCents = values.monthlyMinutes > 0
    ? Math.round(values.fixedSalaryCents * values.overtimeMinutes / values.monthlyMinutes * (1 + values.overtimePercentage / 100)) : 0;
  const grossCents = values.fixedSalaryCents + overtimeCents + values.bonusCents + values.benefitsCents;
  const deductionsCents = values.discountCents + values.advanceCents;
  return { overtimeCents, grossCents, deductionsCents, totalCents: grossCents - deductionsCents };
}

export function employeePayrollAmounts(input: EmployeePayrollInput): PayrollAmounts {
  return { fixedSalaryCents: input.fixedSalary, monthlyMinutes: input.monthlyHours, overtimeMinutes: input.overtimeHours, overtimePercentage: input.overtimePercentage, bonusCents: input.bonus, benefitsCents: input.benefits, discountCents: input.discount, advanceCents: input.advance };
}
