import { getFinanceLedgerPage } from "@/lib/finance/ledger-page";
import { AccountsLedger } from "@/components/finance/accounts-ledger";
import { requireFinanceView } from "@/lib/auth/guards";
import { canDeleteFinancialEntries, canPerformPermission } from "@/lib/permissions";
import { financialEntryPermission } from "@/lib/finance/entry-permissions";

export default async function AccountsReceivablePage(props: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const auth = await requireFinanceView("receivable");
  const { ledger, filters, paymentMethods, categories, banks, plans, products, suppliers, employees, teachers, clients } = await getFinanceLedgerPage(auth.arenaId, "REVENUE", await props.searchParams ?? {});
  const may = (key: string) => canPerformPermission(key, auth.arenaRole, auth.systemRole, auth.editPermissions);
  return <AccountsLedger title="Contas a Receber" type="REVENUE" entries={ledger.entries} pagination={ledger} filters={filters} categories={categories} bankAccounts={banks} plans={plans} products={products} suppliers={suppliers} clients={clients} canCreateEntries={may(financialEntryPermission("REVENUE", "create"))} canEditEntries={may(financialEntryPermission("REVENUE", "edit"))} canSettleEntries={may(financialEntryPermission("REVENUE", "settle"))} canManageSettings={may("finance:settings:manage")} canDeleteEntries={canDeleteFinancialEntries(auth.arenaRole, auth.systemRole, auth.editPermissions)} paymentMethods={paymentMethods} />;
}
