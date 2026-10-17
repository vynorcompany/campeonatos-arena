export type FinancialEntryOperation = "create" | "edit" | "settle";

export function financialEntryPermission(type: string, operation: FinancialEntryOperation) {
  if (type === "REVENUE" || type === "INCOME") return `finance:receivable:${operation}`;
  if (type === "EXPENSE") return `finance:payable:${operation}`;
  throw new Error("Tipo de lançamento financeiro inválido.");
}
