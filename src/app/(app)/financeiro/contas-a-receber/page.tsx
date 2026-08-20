import { AccountsLedger } from "@/components/finance/accounts-ledger";
import { requireModuleView } from "@/lib/auth/guards";
import { getAccountsLedger } from "@/lib/finance/accounts";
import { prisma } from "@/lib/prisma";

export default async function AccountsReceivablePage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const auth = await requireModuleView("finance");
  const filters = { ...searchParams, includeEarlier: searchParams?.includeEarlier === "1", includeVoided: searchParams?.includeVoided === "1", dateField: searchParams?.dateField === "paidAt" ? "paidAt" as const : "dueDate" as const };
  const [entries, methods, categories, banks, plans, products, clients] = await Promise.all([
    getAccountsLedger(auth.arenaId, "REVENUE", filters), prisma.paymentMethodSetting.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.financialCategory.findMany({ where: { arenaId: auth.arenaId, active: true, type: { in: ["REVENUE", "BOTH"] } }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.bankAccount.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.plan.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.player.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);
  return <AccountsLedger title="Contas a Receber" type="REVENUE" entries={entries} filters={filters} categories={categories.map((item) => item.name)} bankAccounts={banks} plans={plans} products={products} suppliers={[]} clients={clients} paymentMethods={methods.length ? methods.map((method) => method.name) : ["Dinheiro", "PIX", "Cartão de crédito", "Cartão de débito", "Saldo de crédito"]} />;
}
