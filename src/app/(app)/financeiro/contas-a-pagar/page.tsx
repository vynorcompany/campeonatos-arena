import { defaultLedgerFilters } from "@/lib/finance/default-ledger-filters";
import { arenaDatabase } from "@/lib/arena-database";
import { AccountsLedger } from "@/components/finance/accounts-ledger";
import { requireFinanceView } from "@/lib/auth/guards";
import { canDeleteFinancialEntries, canPerformPermission } from "@/lib/permissions";
import { financialEntryPermission } from "@/lib/finance/entry-permissions";
import { getAccountsLedgerPage } from "@/lib/finance/accounts";
import { prisma } from "@/lib/prisma";

export default async function AccountsPayablePage(props: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const searchParams = defaultLedgerFilters(await props.searchParams);
  const auth = await requireFinanceView("payable");
  const prisma = arenaDatabase(auth.arenaId);
  const filters = { ...searchParams, includeEarlier: searchParams?.includeEarlier === "1", includeVoided: searchParams?.includeVoided === "1", dateField: searchParams?.dateField === "paidAt" ? "paidAt" as const : "dueDate" as const };
  const [ledger, methods, categories, banks, plans, products, suppliers, employees, teachers, clients] = await Promise.all([
    getAccountsLedgerPage(auth.arenaId, "EXPENSE", filters, searchParams), prisma.paymentMethodSetting.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.financialCategory.findMany({ where: { arenaId: auth.arenaId, active: true, type: { in: ["EXPENSE", "BOTH"] } }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.bankAccount.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.plan.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true, monthlyPriceCents: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.arenaMember.findMany({ where: { arenaId: auth.arenaId }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
    prisma.teacher.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.player.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } })
  ]);
  const may = (key: string) => canPerformPermission(key, auth.arenaRole, auth.systemRole, auth.editPermissions);
  return <AccountsLedger title="Contas a Pagar" type="EXPENSE" entries={ledger.entries} pagination={ledger} filters={filters} categories={categories.map((item) => item.name)} bankAccounts={banks} plans={plans} products={products} suppliers={suppliers} employees={employees.map(member => member.user)} teachers={teachers} clients={clients} canCreateEntries={may(financialEntryPermission("EXPENSE", "create"))} canEditEntries={may(financialEntryPermission("EXPENSE", "edit"))} canSettleEntries={may(financialEntryPermission("EXPENSE", "settle"))} canManageSettings={may("finance:settings:manage")} canDeleteEntries={canDeleteFinancialEntries(auth.arenaRole, auth.systemRole, auth.editPermissions)} paymentMethods={methods.length ? methods.map((method) => method.name) : ["Dinheiro", "PIX", "Cartão de crédito", "Cartão de débito", "Saldo de crédito"]} />;
}
