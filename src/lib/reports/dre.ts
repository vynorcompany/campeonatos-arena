import { arenaWallClockToInstant } from "@/lib/calendar/arena-wall-clock";
import type { Prisma } from "@prisma/client";
export const DRE_GROUP_OPTIONS = [
 ["AUTO", "Automático (receita ou despesa operacional)"], ["REVENUE", "Receita bruta"], ["DEDUCTIONS", "Deduções da receita"], ["COSTS", "Custos dos produtos e serviços"], ["OPEX", "Despesas operacionais"], ["FINANCIAL", "Resultado financeiro"], ["TAXES", "Tributos sobre o resultado"], ["EXCLUDE", "Fora da DRE (transferências, aportes, empréstimos)"]
] as const;
export function parseDreGroup(value: unknown) { const group = String(value || "AUTO"); if (!DRE_GROUP_OPTIONS.some(([id]) => id === group)) throw new Error("Classificação da DRE inválida."); return group; }
export function drePeriod(from?: string, until?: string, now = new Date()) {
 const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
 const valid = (value?: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
 const first = valid(from) ? from! : `${today.slice(0,7)}-01`, last = valid(until) ? until! : today;
 const days = [first,last].sort(); return { gte: new Date(`${days[0]}T00:00:00.000Z`), lte: new Date(`${days[1]}T23:59:59.999Z`) };
}
export function dreCashPeriod(period: { gte: Date; lte: Date }) {
 const instant = (value: Date) => arenaWallClockToInstant(new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds(), value.getUTCMilliseconds()));
 return { gte: instant(period.gte), lte: instant(period.lte) };
}
export function dreReportWhere(arenaId: string, period: { gte: Date; lte: Date }): Prisma.FinancialEntryWhereInput {
 return { arenaId, status: { not: "VOIDED" }, OR: [{ competenceDate: period }, { competenceDate: null, dueDate: period }, { competenceDate: null, dueDate: null, createdAt: dreCashPeriod(period) }] };
}
export function buildDreRows(groups: { type: string; category: string; _sum: { amountCents: number | null } }[], categories: { name: string; dreGroup: string }[], discounts = { revenue: 0, expense: 0 }) {
 const classification = new Map(categories.map(category => [category.name, category.dreGroup]));
 const totals: Record<string, number> = { REVENUE: 0, DEDUCTIONS: discounts.revenue, COSTS: 0, OPEX: -discounts.expense, FINANCIAL: 0, TAXES: 0 };
 for (const group of groups) {
  if (group.category === "CREDITO_DE_CLIENTE") continue;
  const income = ["REVENUE", "INCOME"].includes(group.type); if (!income && group.type !== "EXPENSE") continue;
  const configured = classification.get(group.category) || "AUTO";
  const key = configured === "AUTO" ? income ? "REVENUE" : "OPEX" : configured;
  if (key === "EXCLUDE") continue;
  const amount = group._sum.amountCents ?? 0;
  // Credits reverse costs and expenses; debit entries reverse revenues.
  const positiveForIncome = key === "REVENUE" || key === "FINANCIAL";
  totals[key] = (totals[key] ?? 0) + (income === positiveForIncome ? amount : -amount);
 }
 const netRevenue = totals.REVENUE - totals.DEDUCTIONS, grossProfit = netRevenue - totals.COSTS;
 const operating = grossProfit - totals.OPEX, beforeTax = operating + totals.FINANCIAL;
 return [
  { label: "Receita bruta", amount: totals.REVENUE }, { label: "(−) Deduções da receita", amount: -totals.DEDUCTIONS }, { label: "Receita líquida", amount: netRevenue, subtotal: true },
  { label: "(−) Custos dos produtos e serviços", amount: -totals.COSTS }, { label: "Lucro bruto", amount: grossProfit, subtotal: true }, { label: "(−) Despesas operacionais", amount: -totals.OPEX },
  { label: "Resultado operacional", amount: operating, subtotal: true }, { label: "Resultado financeiro", amount: totals.FINANCIAL }, { label: "Resultado antes dos tributos", amount: beforeTax, subtotal: true },
  { label: "(−) Tributos sobre o resultado", amount: -totals.TAXES }, { label: "Resultado líquido", amount: beforeTax - totals.TAXES, subtotal: true }
 ];
}
