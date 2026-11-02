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
  nightHours: hours.default(0),
  nightOvertimeHours: hours.default(0),
  nightPercentage: z.coerce.number().int().min(20).max(300).default(20),
  nightHourMinutes: z.coerce.number().min(30).max(60).default(52.5),
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
export type PayrollAmounts = { nightMinutes?: number; nightOvertimeMinutes?: number; nightPercentage?: number; nightHourMinutes?: number; fixedSalaryCents: number; monthlyMinutes: number; overtimeMinutes: number; overtimePercentage: number; bonusCents: number; benefitsCents: number; discountCents: number; advanceCents: number };

export function calculateEmployeePayroll(values: PayrollAmounts) {
  const overtimeCents = values.monthlyMinutes > 0
    ? Math.round(values.fixedSalaryCents * values.overtimeMinutes / values.monthlyMinutes * (1 + values.overtimePercentage / 100)) : 0;
  const nightFactor = 60 / (values.nightHourMinutes ?? 52.5);
  const nightRate = (values.nightPercentage ?? 20) / 100;
  // Ordinary night hours are already covered by the monthly salary: add only the premium.
  const nightCents = values.monthlyMinutes > 0 ? Math.round(values.fixedSalaryCents * (values.nightMinutes ?? 0) / values.monthlyMinutes * nightFactor * nightRate) : 0;
  // Night overtime is entered separately from daytime overtime to avoid counting it twice.
  const nightOvertimeCents = values.monthlyMinutes > 0 ? Math.round(values.fixedSalaryCents * (values.nightOvertimeMinutes ?? 0) / values.monthlyMinutes * nightFactor * (1 + nightRate) * (1 + values.overtimePercentage / 100)) : 0;
  const grossCents = values.fixedSalaryCents + overtimeCents + nightCents + nightOvertimeCents + values.bonusCents + values.benefitsCents;
  const deductionsCents = values.discountCents + values.advanceCents;
  return { overtimeCents, nightCents, nightOvertimeCents, nightEquivalentHours: (values.nightMinutes ?? 0) / (values.nightHourMinutes ?? 52.5), nightOvertimeEquivalentHours: (values.nightOvertimeMinutes ?? 0) / (values.nightHourMinutes ?? 52.5), grossCents, deductionsCents, totalCents: grossCents - deductionsCents };
}

export function employeePayrollAmounts(input: EmployeePayrollInput): PayrollAmounts {
  return { nightMinutes: input.nightHours, nightOvertimeMinutes: input.nightOvertimeHours, nightPercentage: input.nightPercentage, nightHourMinutes: input.nightHourMinutes, fixedSalaryCents: input.fixedSalary, monthlyMinutes: input.monthlyHours, overtimeMinutes: input.overtimeHours, overtimePercentage: input.overtimePercentage, bonusCents: input.bonus, benefitsCents: input.benefits, discountCents: input.discount, advanceCents: input.advance };
}
