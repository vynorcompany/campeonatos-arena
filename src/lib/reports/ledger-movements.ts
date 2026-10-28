import { Prisma } from "@prisma/client";

export const ledgerCategories = [
  { value: "@planos", label: "Plano de Aulas" }, { value: "@reservas", label: "Reservas" },
  { value: "@comandas", label: "Comandas" }, { value: "@outros", label: "Outros lançamentos" },
];
type Filters = { type?: string; status?: string; category?: string; paymentMethod?: string; bankAccountId?: string };
type Period = { gte: Date; lte: Date };
type Total = { label: string; count: number; income: number; expense: number };
type RecordRow = { id: string; date: string; description: string; category: string; type: string; method: string; amount: number; status: string };
type Result = { methods: Total[]; days: Total[]; records: RecordRow[]; income: number; expense: number; receivable: number; payable: number };

export function ledgerPeriod(from?: string, until?: string, now = new Date()): Period {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const valid = (value?: string) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00-03:00`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  const startDay = valid(from) ? from! : `${today.slice(0, 7)}-01`;
  const endDay = valid(until) ? until! : today;
  const start = new Date(`${startDay}T00:00:00-03:00`), end = new Date(`${endDay}T23:59:59.999-03:00`);
  return start <= end ? { gte: start, lte: end } : { gte: new Date(`${endDay}T00:00:00-03:00`), lte: new Date(`${startDay}T23:59:59.999-03:00`) };
}

/** Cash movement uses each settlement's date/method, never the face value of its parent invoice.
 * Paid legacy/direct entries are counted only when they have no settlements. Wallet use is not new cash.
 * Outstanding is the current unpaid balance of invoices due in the selected period. */
export async function loadLedgerMovements(db: Pick<Prisma.TransactionClient, "$queryRaw">, arenaId: string, period: Period, filters: Filters = {}): Promise<Result> {
  const category = Prisma.sql`CASE WHEN e."planId" IS NOT NULL THEN '@planos' WHEN e.source = 'SCHEDULE_BOOKING' OR EXISTS (SELECT 1 FROM "ScheduleParticipant" p WHERE p."financialEntryId" = e.id) THEN '@reservas' WHEN e."saleId" IS NOT NULL OR upper(e.category) = 'COMANDAS' THEN '@comandas' ELSE '@outros' END`;
  const scope = Prisma.sql`e."arenaId" = ${arenaId} AND e.status <> 'VOIDED'
    ${filters.type === "REVENUE" ? Prisma.sql`AND e.type IN ('REVENUE','INCOME')` : filters.type === "EXPENSE" ? Prisma.sql`AND e.type = 'EXPENSE'` : Prisma.empty}
    ${filters.status === "PAID" ? Prisma.sql`AND e.status = 'PAID'` : filters.status === "PENDING" ? Prisma.sql`AND e.status IN ('PENDING','OVERDUE')` : Prisma.empty}
    ${filters.category ? ledgerCategories.some(item => item.value === filters.category) ? Prisma.sql`AND (${category}) = ${filters.category}` : Prisma.sql`AND e.category = ${filters.category}` : Prisma.empty}
    ${filters.bankAccountId ? Prisma.sql`AND e."bankAccountId" = ${filters.bankAccountId}` : Prisma.empty}`;
  const method = filters.paymentMethod ? Prisma.sql`AND m.method = ${filters.paymentMethod}` : Prisma.empty;
  const [result] = await db.$queryRaw<Result[]>(Prisma.sql`
    WITH scoped AS (
      SELECT e.id, e.type, e.status, e.description, e.category, e."amountCents", e."paymentMethod", e."paidAt", e."createdAt", e."dueDate"
      FROM "FinancialEntry" e WHERE ${scope}
    ), balances AS (
      SELECT e.*, coalesce(sum(s."amountCents"),0) AS settled, coalesce(sum(s."interestCents"),0) AS interest, coalesce(sum(s."discountCents"),0) AS discount,
        count(s.id) AS settlement_count
      FROM scoped e LEFT JOIN "FinancialSettlement" s ON s."financialEntryId" = e.id AND s."arenaId" = ${arenaId}
      GROUP BY e.id, e.type, e.status, e.description, e.category, e."amountCents", e."paymentMethod", e."paidAt", e."createdAt", e."dueDate"
    ), all_movements AS (
      SELECT s.id, e.id AS entry_id, e.type, e.description, e.category, s."amountCents" AS amount,
        s."paymentMethod" AS method, s."paidAt" AS date
      FROM scoped e JOIN "FinancialSettlement" s ON s."financialEntryId" = e.id AND s."arenaId" = ${arenaId}
      WHERE s."paidAt" BETWEEN ${period.gte} AND ${period.lte}
      UNION ALL
      SELECT e.id, e.id, e.type, e.description, e.category, e."amountCents", e."paymentMethod", coalesce(e."paidAt", e."createdAt")
      FROM balances e WHERE e.status = 'PAID' AND e.settlement_count = 0
        AND coalesce(e."paidAt", e."createdAt") BETWEEN ${period.gte} AND ${period.lte}
    ), movements AS (
      SELECT m.* FROM all_movements m
      WHERE trim(m.method) !~* '^(saldo($|[[:space:]])|cr[eé]dito (do cliente|em conta)($|[[:space:]]))' ${method}
    ), outstanding AS (
      SELECT e.id, e.type, e.description, e.category, e."paymentMethod" AS method,
        coalesce(e."dueDate", e."createdAt") AS date,
        greatest(0, e."amountCents" + e.interest - e.settled - e.discount) AS amount
      FROM balances e WHERE e.status IN ('PENDING','OVERDUE')
        AND coalesce(e."dueDate", e."createdAt") BETWEEN ${period.gte} AND ${period.lte}
        ${filters.paymentMethod ? Prisma.sql`AND e."paymentMethod" = ${filters.paymentMethod}` : Prisma.empty}
    ), methods AS (
      SELECT coalesce(nullif(method,''),'Não informada') AS label, count(*)::int AS count,
        coalesce(sum(amount) FILTER (WHERE type IN ('REVENUE','INCOME')),0) AS income,
        coalesce(sum(amount) FILTER (WHERE type = 'EXPENSE'),0) AS expense
      FROM movements GROUP BY method
    ), days AS (
      SELECT to_char(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD') AS label,
        count(*)::int AS count,
        coalesce(sum(amount) FILTER (WHERE type IN ('REVENUE','INCOME')),0) AS income,
        coalesce(sum(amount) FILTER (WHERE type = 'EXPENSE'),0) AS expense
      FROM movements GROUP BY label
    ), records AS (
      SELECT id, date AT TIME ZONE 'UTC' AS date, description, category, type, method, amount, 'Recebido / pago' AS status FROM movements
      UNION ALL
      SELECT id, date AT TIME ZONE 'UTC' AS date, description, category, type, method, amount, 'Em aberto' FROM outstanding WHERE amount > 0
    ) SELECT
      coalesce((SELECT jsonb_agg(methods ORDER BY label) FROM methods),'[]'::jsonb) AS methods,
      coalesce((SELECT jsonb_agg(days ORDER BY label) FROM days),'[]'::jsonb) AS days,
      coalesce((SELECT jsonb_agg(r ORDER BY date DESC, id) FROM (SELECT * FROM records ORDER BY date DESC, id LIMIT 250) r),'[]'::jsonb) AS records,
      coalesce((SELECT sum(income) FROM methods),0)::double precision AS income,
      coalesce((SELECT sum(expense) FROM methods),0)::double precision AS expense,
      coalesce((SELECT sum(amount) FROM outstanding WHERE type IN ('REVENUE','INCOME')),0)::double precision AS receivable,
      coalesce((SELECT sum(amount) FROM outstanding WHERE type = 'EXPENSE'),0)::double precision AS payable
  `);
  return result;
}
