import { cashReferenceDate } from "@/lib/finance/cash-day";

type PlanStudent = { planId: string; student: { playerId: string | null; name: string } };
type PlanEntry = { planId: string | null; playerId: string | null; counterpartyName: string; status: string; dueDate: Date | null };

export function matchesPlanPaymentFilter(subscription: PlanStudent, entries: PlanEntry[], filter?: string, now = new Date()) {
  if (!filter || filter === "TODOS") return true;
  const today = cashReferenceDate(now);
  return entries.some((entry) => {
    if (entry.planId !== subscription.planId) return false;
    const sameStudent = subscription.student.playerId
      ? entry.playerId === subscription.student.playerId || (entry.playerId === null && entry.counterpartyName === subscription.student.name)
      : entry.playerId === null && entry.counterpartyName === subscription.student.name;
    if (!sameStudent) return false;
    if (filter === "PAID") return entry.status === "PAID";
    if (filter === "PENDING") return entry.status === "PENDING" || entry.status === "OVERDUE";
    if (filter === "OVERDUE") return entry.status === "OVERDUE" || (entry.status === "PENDING" && Boolean(entry.dueDate && entry.dueDate < today));
    return false;
  });
}
