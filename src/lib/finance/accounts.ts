import { getFinancialEntryBalance } from "@/lib/finance/ledger";
import { classificationFilter } from "@/lib/finance/classification-filter";
import { withArenaTransaction } from "@/lib/rls";

export type LedgerFilters = { name?: string; start?: string; end?: string; status?: string; paymentMethod?: string; bankAccountId?: string; category?: string; description?: string; productId?: string; planId?: string; dateField?: "dueDate" | "paidAt"; includeEarlier?: boolean; includeVoided?: boolean; };

function parseFilterDate(value?: string, end = false) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}`) : null; }

export async function getAccountsLedger(arenaId: string, type: "REVENUE" | "EXPENSE", filters: LedgerFilters = {}) {
  const dateField = filters.dateField === "paidAt" ? "paidAt" : "dueDate";
  const start = parseFilterDate(filters.start); const end = parseFilterDate(filters.end, true);
  const where: Record<string, unknown> = { arenaId, type: type === "REVENUE" ? { in: ["REVENUE", "INCOME"] } : type };
  const conditions: Record<string, unknown>[] = [];
  if (!filters.includeVoided) where.status = filters.status || { not: "VOIDED" }; else if (filters.status) where.status = filters.status;
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
  if (filters.bankAccountId) where.bankAccountId = filters.bankAccountId;
  if (filters.category) conditions.push(classificationFilter(filters.category));
  if (filters.description) where.description = { contains: filters.description, mode: "insensitive" };
  if (filters.planId?.startsWith("teacher:")) conditions.push({ plan: { teacherAssignments: { some: { teacherId: filters.planId.slice(8), active: true } } } });
  else if (filters.planId) where.planId = filters.planId;
  if (filters.productId) conditions.push({ OR: [{ productId: filters.productId }, { sale: { items: { some: { productId: filters.productId } } } }] });
  if (filters.name) conditions.push({ OR: [{ counterpartyName: { contains: filters.name, mode: "insensitive" } }, { supplier: { name: { contains: filters.name, mode: "insensitive" } } }, { scheduleParticipant: { player: { name: { contains: filters.name, mode: "insensitive" } } } }, { sale: { customerName: { contains: filters.name, mode: "insensitive" } } }] });
  if (conditions.length) where.AND = conditions;
  if (start || end) where[dateField] = { ...(start && !filters.includeEarlier ? { gte: start } : {}), ...(end ? { lte: end } : {}) };
  const entries = await withArenaTransaction(arenaId, (tx) => tx.financialEntry.findMany({ where, orderBy: [{ [dateField]: "asc" }, { createdAt: "asc" }], include: { settlements: { select: { amountCents: true, interestCents: true, paymentMethod: true, paidAt: true, notes: true } }, recurrence: { select: { onlinePaymentMethod: true } }, scheduleParticipant: { select: { player: { select: { name: true } } } }, sale: { select: { customerName: true, comanda: { select: { id: true, code: true, label: true } } } }, supplier: { select: { name: true } } } }));
  return entries.map((entry) => ({ id: entry.id, source: entry.source, counterpartyName: entry.counterpartyName || entry.supplier?.name || entry.scheduleParticipant?.player.name || entry.sale?.comanda?.label || entry.sale?.customerName || "Não informado", category: entry.category, description: entry.description, amountCents: entry.amountCents, paymentMethod: entry.paymentMethod, bankAccountId: entry.bankAccountId, planId: entry.planId, productId: entry.productId, comanda: entry.sale?.comanda ? { id: entry.sale.comanda.id, code: entry.sale.comanda.code, label: entry.sale.comanda.label } : null, onlineProvider: entry.onlineProvider, onlinePaymentId: entry.onlinePaymentId, onlinePaymentUrl: entry.onlinePaymentUrl, onlinePaymentQrCode: entry.onlinePaymentQrCode, onlinePaymentMethod: entry.recurrence?.onlinePaymentMethod ?? "", onlinePaymentPublishedAt: entry.onlinePaymentPublishedAt?.toISOString() ?? null, onlinePaymentViewedAt: entry.onlinePaymentViewedAt?.toISOString() ?? null, dueDate: entry.dueDate ? entry.dueDate.toISOString().slice(0, 10) : null, notes: entry.notes, status: entry.status, voidReason: entry.voidReason, settlements: entry.settlements.map((settlement) => ({ ...settlement, paidAt: settlement.paidAt.toISOString().slice(0, 10) })), balance: getFinancialEntryBalance(entry.amountCents, entry.settlements, entry.status) }));
}
