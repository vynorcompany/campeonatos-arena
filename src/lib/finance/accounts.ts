import { getFinancialEntryBalance } from "@/lib/finance/ledger";
import { prisma } from "@/lib/prisma";

export async function getAccountsLedger(arenaId: string, type: "REVENUE" | "EXPENSE") {
  const entries = await prisma.financialEntry.findMany({
    where: { arenaId, type },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    include: {
      settlements: { select: { amountCents: true, interestCents: true } },
      scheduleParticipant: { select: { player: { select: { name: true } } } },
      sale: { select: { customerName: true, comanda: { select: { label: true } } } }
    }
  });

  return entries.map((entry) => ({
    id: entry.id,
    counterpartyName: entry.counterpartyName || entry.scheduleParticipant?.player.name || entry.sale?.comanda?.label || entry.sale?.customerName || "Não informado",
    category: entry.category,
    description: entry.description,
    amountCents: entry.amountCents,
    dueDate: entry.dueDate ? entry.dueDate.toISOString().slice(0, 10) : null,
    status: entry.status,
    voidReason: entry.voidReason,
    balance: getFinancialEntryBalance(entry.amountCents, entry.settlements, entry.status)
  }));
}
