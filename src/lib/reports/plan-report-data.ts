import type { Prisma, PrismaClient } from "@prisma/client";
import { matchesPlanPaymentFilter } from "@/lib/reports/plan-payment-filter";

const PAGE_SIZE = 500;
const DISPLAY_LIMIT = 250;
const subscriptionSelect = {
  id: true,
  planId: true,
  status: true,
  monthlyPriceCents: true,
  classesPerMonth: true,
  createdAt: true,
  plan: { select: { name: true } },
  student: { select: { name: true, playerId: true } },
} as const;

type SubscriptionRow = Prisma.StudentSubscriptionGetPayload<{ select: typeof subscriptionSelect }>;
type SummaryRow = { label: string; count: number; total: number };

export async function loadPlanReportData(
  db: Pick<PrismaClient, "studentSubscription" | "financialEntry">,
  arenaId: string,
  period: { gte: Date; lte: Date },
  options: { teacherId?: string; paymentFilter?: string } = {},
) {
  const paymentFilter = options.paymentFilter;
  const entries = paymentFilter && paymentFilter !== "TODOS"
    ? await db.financialEntry.findMany({
      where: { arenaId, planId: { not: null }, dueDate: period, status: { in: paymentFilter === "PAID" ? ["PAID"] : ["PENDING", "OVERDUE"] } },
      select: { planId: true, playerId: true, counterpartyName: true, status: true, dueDate: true },
    })
    : [];
  const entriesByPlan = new Map<string, typeof entries>();
  for (const entry of entries) {
    if (!entry.planId) continue;
    const group = entriesByPlan.get(entry.planId) ?? [];
    group.push(entry);
    entriesByPlan.set(entry.planId, group);
  }

  const where: Prisma.StudentSubscriptionWhereInput = {
    arenaId,
    createdAt: period,
    ...(options.teacherId ? { plan: { teacherAssignments: { some: { arenaId, teacherId: options.teacherId, active: true } } } } : {}),
  };
  const subscriptions: SubscriptionRow[] = [];
  const byPlan = new Map<string, SummaryRow>();
  const byMonth = new Map<string, SummaryRow>();
  let soldCount = 0;
  let activeCount = 0;
  let activeMonthlyCents = 0;
  let cursor: string | undefined;
  const now = new Date();

  while (true) {
    const page = await db.studentSubscription.findMany({
      where,
      select: subscriptionSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const subscription of page) {
      if (!matchesPlanPaymentFilter(subscription, entriesByPlan.get(subscription.planId) ?? [], paymentFilter, now)) continue;
      soldCount += 1;
      if (subscription.status === "ACTIVE") {
        activeCount += 1;
        activeMonthlyCents += subscription.monthlyPriceCents;
      }
      if (subscriptions.length < DISPLAY_LIMIT) subscriptions.push(subscription);
      const planName = subscription.plan.name;
      const planSummary = byPlan.get(planName) ?? { label: planName, count: 0, total: 0 };
      planSummary.count += 1;
      planSummary.total += subscription.monthlyPriceCents;
      byPlan.set(planName, planSummary);
      const month = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(subscription.createdAt);
      const monthSummary = byMonth.get(month) ?? { label: month, count: 0, total: 0 };
      monthSummary.count += 1;
      monthSummary.total += subscription.monthlyPriceCents;
      byMonth.set(month, monthSummary);
    }
    if (page.length < PAGE_SIZE) break;
    cursor = page[page.length - 1].id;
  }

  const sortSummaries = (groups: Map<string, SummaryRow>) => [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
  return { subscriptions, soldCount, activeCount, activeMonthlyCents, planSales: sortSummaries(byPlan), monthlySales: sortSummaries(byMonth) };
}
