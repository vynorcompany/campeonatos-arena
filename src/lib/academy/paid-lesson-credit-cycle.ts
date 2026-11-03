import { instantToArenaWallClock } from "../calendar/arena-wall-clock";

/** A paid monthly bill grants one allowance to its subscription, exactly once. */
export function paidLessonCreditCycle(
  subscription: { id: string; planId: string; startedAt: Date; createdAt: Date },
  entry: { planId: string | null; dueDate: Date | null; createdAt: Date; paidAt: Date | null; status: string },
  now: Date,
) {
  if (entry.status !== "PAID" || entry.planId !== subscription.planId || !entry.dueDate || entry.createdAt < subscription.createdAt) return null;
  const month = (value: Date) => `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
  const dueMonth = month(entry.dueDate);
  // Paying a future bill does not advance its monthly allowance.
  const arenaNow = instantToArenaWallClock(now);
  const currentMonth = `${arenaNow.getFullYear()}-${String(arenaNow.getMonth() + 1).padStart(2, "0")}`;
  if (dueMonth < month(subscription.startedAt) || dueMonth > currentMonth) return null;
  return { sourceKey: `MONTH:${subscription.id}:${dueMonth}`, year: entry.dueDate.getUTCFullYear(), month: entry.dueDate.getUTCMonth() };
}
