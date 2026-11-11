import { paginationInput, paginationRange } from "@/lib/pagination";
import { accountLastPaymentDate } from "@/lib/finance/account-payment-date";
import { getFinancialEntryBalance } from "@/lib/finance/ledger";
import { classificationFilter } from "@/lib/finance/classification-filter";
import { teacherPlanCondition } from "@/lib/finance/plan-filter";
import { withArenaTransaction } from "@/lib/rls";

export type LedgerFilters = { name?: string; start?: string; end?: string; status?: string; paymentMethod?: string; bankAccountId?: string; category?: string; description?: string; productId?: string; planId?: string; dateField?: "dueDate" | "paidAt"; includeEarlier?: boolean; includeVoided?: boolean; };

function parseFilterDate(value?: string, end = false) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}`) : null; }

function ledgerWhere(arenaId: string, type: "REVENUE" | "EXPENSE", filters: LedgerFilters = {}) {
  const dateField: "paidAt" | "dueDate" = filters.dateField === "paidAt" ? "paidAt" : "dueDate";
  const start = parseFilterDate(filters.start); const end = parseFilterDate(filters.end, true);
  const where: Record<string, unknown> = { arenaId, type: type === "REVENUE" ? { in: ["REVENUE", "INCOME"] } : type };
  const conditions: Record<string, unknown>[] = [];
  if (filters.status === "OPEN" || filters.status === "PENDING") where.status = { in: ["PENDING", "OVERDUE", "PARTIAL"] };
  else if (!filters.includeVoided) where.status = filters.status && filters.status !== "ALL" ? filters.status : { not: "VOIDED" }; else if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
  if (filters.bankAccountId) where.bankAccountId = filters.bankAccountId;
  if (filters.category) conditions.push(classificationFilter(filters.category));
  if (filters.description) where.description = { contains: filters.description, mode: "insensitive" };
  if (filters.planId?.startsWith("teacher:")) {
    const teacherId = filters.planId.slice("teacher:".length);
    if (teacherId) conditions.push(teacherPlanCondition(teacherId));
  }
  else if (filters.planId) where.planId = filters.planId;
  if (filters.productId) conditions.push({ OR: [{ productId: filters.productId }, { sale: { items: { some: { productId: filters.productId } } } }] });
  if (filters.name) conditions.push({ OR: [{ billingPlayer: { name: { contains: filters.name, mode: "insensitive" } } }, { counterpartyName: { contains: filters.name, mode: "insensitive" } }, { player: { name: { contains: filters.name, mode: "insensitive" } } }, { supplier: { name: { contains: filters.name, mode: "insensitive" } } }, { scheduleParticipant: { player: { name: { contains: filters.name, mode: "insensitive" } } } }, { sale: { customerName: { contains: filters.name, mode: "insensitive" } } }] });
  if (start || end) {
    const range = { ...(start && !filters.includeEarlier ? { gte: start } : {}), ...(end ? { lte: end } : {}) };
    // An undated obligation must remain visible. Paid entries without a due
    // date belong to their payment month; do not invent a due date to list them.
    if (dateField === "dueDate") conditions.push({ OR: [
      { dueDate: range },
      { dueDate: null, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
      { dueDate: null, status: "PAID", paidAt: range },
    ] });
    else where[dateField] = range;
  }
  if (conditions.length) where.AND = conditions;
  return { where, dateField };
}

export async function getAccountsLedger(arenaId: string, type: "REVENUE" | "EXPENSE", filters: LedgerFilters = {}, paging?: { skip: number; take: number }) {
  const { where, dateField } = ledgerWhere(arenaId, type, filters);
  const entries = await withArenaTransaction(arenaId, (tx) => tx.financialEntry.findMany({ where, ...(paging ? { skip: paging.skip, take: paging.take } : {}), orderBy: [{ [dateField]: dateField === "dueDate" && type === "REVENUE" ? { sort: "asc", nulls: "first" } : "asc" }, { createdAt: "asc" }, { id: "asc" }], include: { fiscalDocument:{select:{id:true}}, billingPlayer: { select: { name: true } }, player: { select: { name: true } }, settlements: { select: { amountCents: true, interestCents: true, discountCents: true, paymentMethod: true, paidAt: true, notes: true } }, recurrence: { select: { onlinePaymentMethod: true } }, scheduleParticipant: { select: { player: { select: { name: true } } } }, sale: { select: { customerName: true, comanda: { select: { id: true, code: true, label: true } } } }, supplier: { select: { name: true } } } }));
  return entries.map((entry) => ({ id: entry.id, updatedAt: entry.updatedAt.toISOString(), source: entry.source, canCardInstallment: entry.source==="MANUAL"&&entry.status==="PENDING"&&!entry.recurrenceId&&!entry.saleId&&!entry.planId&&!entry.scheduleParticipant&&!entry.fiscalDocument&&!entry.onlinePaymentId&&!entry.onlinePaymentUrl&&!entry.settlements.length, playerId: entry.playerId, supplierId: entry.supplierId, payeeEmployeeId: entry.payeeEmployeeId, payeeTeacherId: entry.payeeTeacherId, counterpartyName: entry.billingPlayer?.name || entry.counterpartyName || entry.player?.name || entry.supplier?.name || entry.scheduleParticipant?.player.name || entry.sale?.comanda?.label || entry.sale?.customerName || "Não informado", category: entry.category, description: entry.billingPlayerId && entry.billingPlayerId !== entry.playerId ? `${entry.description} · Dependente: ${entry.player?.name ?? "Cliente"}` : entry.description, amountCents: entry.amountCents, paymentMethod: entry.paymentMethod, bankAccountId: entry.bankAccountId, planId: entry.planId, productId: entry.productId, comanda: entry.sale?.comanda ? { id: entry.sale.comanda.id, code: entry.sale.comanda.code, label: entry.sale.comanda.label } : null, onlineProvider: entry.onlineProvider, onlinePaymentId: entry.onlinePaymentId, onlinePaymentUrl: entry.onlinePaymentUrl, onlinePaymentQrCode: entry.onlinePaymentQrCode, onlinePaymentMethod: entry.recurrence?.onlinePaymentMethod ?? "", onlinePaymentPublishedAt: entry.onlinePaymentPublishedAt?.toISOString() ?? null, onlinePaymentViewedAt: entry.onlinePaymentViewedAt?.toISOString() ?? null, competenceDate: entry.competenceDate?.toISOString().slice(0, 10) ?? null, dueDate: entry.dueDate ? entry.dueDate.toISOString().slice(0, 10) : null, paidAt: accountLastPaymentDate(entry), notes: entry.notes, status: entry.status, voidReason: entry.voidReason, settlements: entry.settlements.map((settlement) => ({ ...settlement, paidAt: settlement.paidAt.toISOString().slice(0, 10) })), balance: getFinancialEntryBalance(entry.amountCents, entry.settlements, entry.status) }));
}

export async function getAccountsLedgerPage(arenaId: string, type: "REVENUE" | "EXPENSE", filters: LedgerFilters, input: { page?: unknown; pageSize?: unknown; entryId?: unknown; entry?: unknown }) {
  const { where, dateField } = ledgerWhere(arenaId, type, filters), request = paginationInput(input);
  // A notification may point beyond the first page. Locate that page under the same filters and RLS.
  const targetId = String(input.entryId ?? input.entry ?? "");
  if (!input.page && targetId && targetId.length <= 160) {
    const before = await withArenaTransaction(arenaId, async tx => {
      const target = await tx.financialEntry.findFirst({ where: { AND: [where, { id: targetId }] }, select: { id: true, dueDate: true, paidAt: true, createdAt: true } });
      if (!target) return null;
      const value = target[dateField], nullsFirst = dateField === "dueDate" && type === "REVENUE";
      const sameDateBefore = { [dateField]: value, OR: [{ createdAt: { lt: target.createdAt } }, { createdAt: target.createdAt, id: { lt: target.id } }] };
      const earlier: Record<string, unknown>[] = [sameDateBefore];
      if (value) { earlier.push({ [dateField]: { lt: value } }); if (nullsFirst) earlier.push({ [dateField]: null }); }
      else if (!nullsFirst) earlier.push({ [dateField]: { not: null } });
      return tx.financialEntry.count({ where: { AND: [where, { OR: earlier }] } });
    });
    if (before !== null) request.page = Math.floor(before / request.pageSize) + 1;
  }
  const summary = await withArenaTransaction(arenaId, async tx => {
    const [total, active] = await Promise.all([
      tx.financialEntry.count({ where }),
      tx.financialEntry.aggregate({ where: { AND: [where, { status: { not: "VOIDED" }, source: { not: "AGENCY_SUBSCRIPTION" } }] }, _sum: { amountCents: true }, _count: true }),
    ]);
    return { total, activeCount: active._count, totalCents: active._sum.amountCents ?? 0 };
  });
  const range = paginationRange(summary.total, request.page, request.pageSize);
  const entries = await getAccountsLedger(arenaId, type, filters, { skip: (range.page - 1) * request.pageSize, take: request.pageSize });
  return { ...summary, entries, page: range.page, pageSize: request.pageSize };
}
