import { arenaDatabase } from "@/lib/arena-database";
import { AccountsLedger } from "@/components/finance/accounts-ledger";
import { requireFinanceView } from "@/lib/auth/guards";
import { canDeleteFinancialEntries, canPerformPermission } from "@/lib/permissions";
import { financialEntryPermission } from "@/lib/finance/entry-permissions";
import { getAccountsLedger } from "@/lib/finance/accounts";
import { prisma } from "@/lib/prisma";

export default async function AccountsPayablePage(props: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams;
  const auth = await requireFinanceView("payable");
  const prisma = arenaDatabase(auth.arenaId);
  const filters = { ...searchParams, includeEarlier: searchParams?.includeEarlier === "1", includeVoided: searchParams?.includeVoided === "1", dateField: searchParams?.dateField === "paidAt" ? "paidAt" as const : "dueDate" as const };
  const [entries, methods, categories, banks, plans, products, suppliers] = await Promise.all([
    getAccountsLedger(auth.arenaId, "EXPENSE", filters), prisma.paymentMethodSetting.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.financialCategory.findMany({ where: { arenaId: auth.arenaId, active: true, type: { in: ["EXPENSE", "BOTH"] } }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.bankAccount.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.plan.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true, monthlyPriceCents: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);
  const may = (key: string) => canPerformPermission(key, auth.arenaRole, auth.systemRole, auth.editPermissions);
  return <AccountsLedger title="Contas a Pagar" type="EXPENSE" entries={entries} filters={filters} categories={categories.map((item) => item.name)} bankAccounts={banks} plans={plans} products={products} suppliers={suppliers} clients={[]} canCreateEntries={may(financialEntryPermission("EXPENSE", "create"))} canEditEntries={may(financialEntryPermission("EXPENSE", "edit"))} canSettleEntries={may(financialEntryPermission("EXPENSE", "settle"))} canManageSettings={may("finance:settings:manage")} canDeleteEntries={canDeleteFinancialEntries(auth.arenaRole, auth.systemRole, auth.editPermissions)} paymentMethods={methods.length ? methods.map((method) => method.name) : ["Dinheiro", "PIX", "Cartão de crédito", "Cartão de débito", "Saldo de crédito"]} />;
}
