import { getFinancialEntryBalance } from "@/lib/finance/ledger";
import { withArenaTransaction } from "@/lib/rls";

export type LedgerFilters = { name?: string; start?: string; end?: string; status?: string; paymentMethod?: string; bankAccountId?: string; category?: string; description?: string; productId?: string; planId?: string; dateField?: "dueDate" | "paidAt"; includeEarlier?: boolean; includeVoided?: boolean; };

function parseFilterDate(value?: string, end = false) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}`) : null; }

export async function getAccountsLedger(arenaId: string, type: "REVENUE" | "EXPENSE", filters: LedgerFilters = {}) {
  const dateField = filters.dateField === "paidAt" ? "paidAt" : "dueDate";
  const start = parseFilterDate(filters.start); const end = parseFilterDate(filters.end, true);
  const where: Record<string, unknown> = { arenaId, type };
  if (!filters.includeVoided) where.status = filters.status || { not: "VOIDED" }; else if (filters.status) where.status = filters.status;
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
  if (filters.bankAccountId) where.bankAccountId = filters.bankAccountId;
  if (filters.category) where.category = filters.category;
  if (filters.description) where.description = { contains: filters.description, mode: "insensitive" };
  if (filters.planId) where.planId = filters.planId;
  if (filters.productId) where.OR = [{ productId: filters.productId }, { sale: { items: { some: { productId: filters.productId } } } }];
  if (filters.name) where.AND = [{ OR: [{ counterpartyName: { contains: filters.name, mode: "insensitive" } }, { supplier: { name: { contains: filters.name, mode: "insensitive" } } }, { scheduleParticipant: { player: { name: { contains: filters.name, mode: "insensitive" } } } }, { sale: { customerName: { contains: filters.name, mode: "insensitive" } } }] }];
  if (start || end) where[dateField] = { ...(start && !filters.includeEarlier ? { gte: start } : {}), ...(end ? { lte: end } : {}) };
  const entries = await withArenaTransaction(arenaId, (tx) => tx.financialEntry.findMany({ where, orderBy: [{ [dateField]: "asc" }, { createdAt: "asc" }], include: { settlements: { select: { amountCents: true, interestCents: true, paymentMethod: true, paidAt: true, notes: true } }, scheduleParticipant: { select: { player: { select: { name: true } } } }, sale: { select: { customerName: true, comanda: { select: { label: true } } } }, supplier: { select: { name: true } } } }));
  return entries.map((entry) => ({ id: entry.id, counterpartyName: entry.counterpartyName || entry.supplier?.name || entry.scheduleParticipant?.player.name || entry.sale?.comanda?.label || entry.sale?.customerName || "Não informado", category: entry.category, description: entry.description, amountCents: entry.amountCents, paymentMethod: entry.paymentMethod, bankAccountId: entry.bankAccountId, planId: entry.planId, productId: entry.productId, dueDate: entry.dueDate ? entry.dueDate.toISOString().slice(0, 10) : null, notes: entry.notes, status: entry.status, voidReason: entry.voidReason, settlements: entry.settlements.map((settlement) => ({ ...settlement, paidAt: settlement.paidAt.toISOString().slice(0, 10) })), balance: getFinancialEntryBalance(entry.amountCents, entry.settlements, entry.status) }));
}
