import { cashReferenceDate } from "@/lib/finance/cash-day";

export type ClientFinancialEntry = { status: string; dueDate: Date | null };
export type ClientFinancialStatus = "Saudável" | "Com débitos em aberto" | "Em atraso";

export function clientFinancialStatus(entries: ClientFinancialEntry[], now = new Date()): ClientFinancialStatus {
  const today = cashReferenceDate(now);
  const open = entries.filter((entry) => entry.status === "PENDING" || entry.status === "OVERDUE");
  if (open.some((entry) => entry.status === "OVERDUE" || Boolean(entry.dueDate && entry.dueDate < today))) return "Em atraso";
  return open.length ? "Com débitos em aberto" : "Saudável";
}

export function matchesClientFinancialFilter(status: ClientFinancialStatus, filter?: string) {
  return !filter || filter === "ALL" ||
    (filter === "CURRENT" && status === "Saudável") ||
    (filter === "OPEN" && status !== "Saudável") ||
    (filter === "OVERDUE" && status === "Em atraso");
}
