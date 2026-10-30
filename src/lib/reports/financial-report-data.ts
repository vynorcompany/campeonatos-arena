import type { Prisma, PrismaClient } from "@prisma/client";

type FinancialReportFilters = {
  arenaId: string;
  period: { gte: Date; lte: Date };
  type?: string;
  status?: string;
  category?: string;
  paymentMethod?: string;
  bankAccountId?: string;
};

export function financialReportWhere(filters: FinancialReportFilters): Prisma.FinancialEntryWhereInput {
  return {
    arenaId: filters.arenaId,
    createdAt: filters.period,
    status: filters.status && ["PAID", "PENDING", "OVERDUE"].includes(filters.status) ? filters.status : { not: "VOIDED" },
    ...(filters.type === "REVENUE" ? { type: { in: ["REVENUE", "INCOME"] } } : filters.type === "EXPENSE" ? { type: "EXPENSE" } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
    ...(filters.bankAccountId ? { bankAccountId: filters.bankAccountId } : {}),
  };
}

export async function loadLedgerReportData(db: Pick<PrismaClient, "financialEntry">, where: Prisma.FinancialEntryWhereInput) {
  const [entries, byType, byPaymentStatus] = await Promise.all([
    db.financialEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 250 }),
    db.financialEntry.groupBy({ where, by: ["type"], _sum: { amountCents: true } }),
    db.financialEntry.groupBy({ where, by: ["status", "paymentMethod"], _sum: { amountCents: true }, _count: { _all: true } }),
  ]);
  return { entries, byType, byPaymentStatus };
}

export async function loadDreReportData(db: Pick<PrismaClient, "financialEntry">, where: Prisma.FinancialEntryWhereInput) {
  const byType = await db.financialEntry.groupBy({ where, by: ["type", "category"], _sum: { amountCents: true } });
  return { byType };
}

export function financialTypeTotals(groups: Array<{ type: string; _sum: { amountCents: number | null } }>) {
  const revenue = groups.filter((group) => ["REVENUE", "INCOME"].includes(group.type)).reduce((total, group) => total + (group._sum.amountCents ?? 0), 0);
  const expense = groups.filter((group) => group.type === "EXPENSE").reduce((total, group) => total + (group._sum.amountCents ?? 0), 0);
  return { revenue, expense };
}
