import { AccountsLedger } from "@/components/finance/accounts-ledger";
import { requireModuleView } from "@/lib/auth/guards";
import { getAccountsLedger } from "@/lib/finance/accounts";
import { prisma } from "@/lib/prisma";

export default async function AccountsPayablePage() {
  const auth = await requireModuleView("finance");
  const [entries, methods] = await Promise.all([
    getAccountsLedger(auth.arenaId, "EXPENSE"),
    prisma.paymentMethodSetting.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { name: true }, orderBy: { name: "asc" } })
  ]);
  return <AccountsLedger title="Contas a Pagar" type="EXPENSE" entries={entries} paymentMethods={methods.length ? methods.map((method) => method.name) : ["Dinheiro", "PIX", "Cartão de crédito", "Cartão de débito", "Saldo de crédito"]} />;
}
