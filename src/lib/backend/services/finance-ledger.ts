import 'server-only';
import { arenaDatabase } from '@/lib/arena-database';
import { getAccountsLedgerPage } from '@/lib/finance/accounts';
import { defaultLedgerFilters } from '@/lib/finance/default-ledger-filters';
import { financeLedgerQuerySchema, financeLedgerPageSchema, type FinanceLedgerQuery, type FinanceLedgerType } from '@/lib/backend/contracts/finance-ledger';
export async function resolveFinanceLedgerPage(arenaId: string, type: FinanceLedgerType, input: FinanceLedgerQuery) {
  const query = defaultLedgerFilters(financeLedgerQuerySchema.parse(input));
  return financeLedgerPageSchema.parse(await (type === 'REVENUE' ? resolveREVENUE(arenaId, query) : resolveEXPENSE(arenaId, query)));
}
async function resolveREVENUE(arenaId: string, searchParams: FinanceLedgerQuery) {
  const prisma = arenaDatabase(arenaId);
  const filters = { ...searchParams, includeEarlier: searchParams?.includeEarlier === "1", includeVoided: searchParams?.includeVoided === "1", dateField: searchParams?.dateField === "paidAt" ? "paidAt" as const : "dueDate" as const };
  const [ledger, methods, categories, banks, plans, products, clients, usedCategories] = await Promise.all([
    getAccountsLedgerPage(arenaId, "REVENUE", filters, searchParams), prisma.paymentMethodSetting.findMany({ where: { arenaId: arenaId, active: true }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.financialCategory.findMany({ where: { arenaId: arenaId, active: true, type: { in: ["REVENUE", "BOTH"] } }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.bankAccount.findMany({ where: { arenaId: arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.plan.findMany({ where: { arenaId: arenaId, active: true }, select: { id: true, name: true, monthlyPriceCents: true, teacherAssignments: { where: { active: true }, select: { monthlyPriceCents: true, teacher: { select: { id: true, name: true } } }, orderBy: { teacher: { name: "asc" } } } }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { arenaId: arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.player.findMany({ where: { arenaId: arenaId, active: true }, select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } }),
    prisma.financialEntry.groupBy({ by: ["category"], where: { arenaId: arenaId, type: { in: ["REVENUE", "INCOME"] }, category: { not: "" } }, orderBy: { category: "asc" } })
  ]);
  const planOptions = plans.flatMap(({ teacherAssignments, ...plan }) => teacherAssignments.length
    ? teacherAssignments.map(({ teacher, monthlyPriceCents }) => ({ ...plan, monthlyPriceCents, teacherId: teacher.id, teacherName: teacher.name }))
    : [{ ...plan, teacherId: "", teacherName: "" }]);
  return { ledger, filters, categories: [...new Set([...categories.map(item => item.name), ...usedCategories.map(item => item.category)])], banks, plans: planOptions, products, suppliers: [], clients, employees: [], teachers: [], paymentMethods: methods.length ? methods.map(method => method.name) : ['Dinheiro', 'PIX', 'Cartão de crédito', 'Cartão de débito'] };
}

async function resolveEXPENSE(arenaId: string, searchParams: FinanceLedgerQuery) {
  const prisma = arenaDatabase(arenaId);
  const filters = { ...searchParams, includeEarlier: searchParams?.includeEarlier === "1", includeVoided: searchParams?.includeVoided === "1", dateField: searchParams?.dateField === "paidAt" ? "paidAt" as const : "dueDate" as const };
  const [ledger, methods, categories, banks, plans, products, suppliers, employees, teachers, clients] = await Promise.all([
    getAccountsLedgerPage(arenaId, "EXPENSE", filters, searchParams), prisma.paymentMethodSetting.findMany({ where: { arenaId: arenaId, active: true }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.financialCategory.findMany({ where: { arenaId: arenaId, active: true, type: { in: ["EXPENSE", "BOTH"] } }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.bankAccount.findMany({ where: { arenaId: arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.plan.findMany({ where: { arenaId: arenaId, active: true }, select: { id: true, name: true, monthlyPriceCents: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { arenaId: arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { arenaId: arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.arenaMember.findMany({ where: { arenaId: arenaId }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
    prisma.teacher.findMany({ where: { arenaId: arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.player.findMany({ where: { arenaId: arenaId, active: true }, select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } })
  ]);
  return { ledger, filters, categories: categories.map(item => item.name), banks, plans, products, suppliers, employees: employees.map(member => member.user), teachers, clients, paymentMethods: methods.length ? methods.map(method => method.name) : ['Dinheiro', 'PIX', 'Cartão de crédito', 'Cartão de débito', 'Saldo de crédito'] };
}
