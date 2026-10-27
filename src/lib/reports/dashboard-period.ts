import { arenaToday } from "@/lib/calendar/arena-wall-clock";
import { dashboardDateKey } from "./dashboard-projections";
export function dashboardPeriod(start?: string, end?: string, now = new Date()) {
  const today = arenaToday(now);
  const defaultFrom = new Date(today); defaultFrom.setDate(defaultFrom.getDate() - 29);
  const parse = (value: string | undefined, fallback: Date) => {
    if (!value) return new Date(fallback);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime()) && dashboardDateKey(date) === value ? date : null;
  };
  const from = parse(start, defaultFrom), to = parse(end, today);
  if (!from || !to || from > to || to.getTime() - from.getTime() > 365 * 86_400_000) return { error: "Selecione um período válido de até 366 dias, com o início anterior ao fim." } as const;
  to.setHours(23, 59, 59, 999);
  const horizonEnd = new Date(Math.max(to.getTime(), new Date(from.getFullYear(), from.getMonth() + 6, 0, 23, 59, 59, 999).getTime()));
  return { from, to, horizonEnd, today } as const;
}
/** Shift full-month and month-end periods without overflowing February into March. */
export function shiftDashboardPeriod(from: Date, to: Date, months: number) {
  const shift = (date: Date) => new Date(date.getFullYear(), date.getMonth() + months, Math.min(date.getDate(), new Date(date.getFullYear(), date.getMonth() + months + 1, 0).getDate()), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
  return { from: shift(from), to: shift(to) };
}
