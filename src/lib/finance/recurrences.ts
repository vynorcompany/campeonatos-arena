export type FinancialRecurrenceFrequency = "WEEKLY" | "MONTHLY" | "ANNUAL";

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function getNextFinancialRecurrenceDate(current: Date, frequency: FinancialRecurrenceFrequency) {
  const next = new Date(current);
  if (frequency === "WEEKLY") {
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }

  const day = current.getUTCDate();
  const year = current.getUTCFullYear() + (frequency === "ANNUAL" ? 1 : 0);
  const month = frequency === "ANNUAL" ? current.getUTCMonth() : current.getUTCMonth() + 1;
  next.setUTCDate(1);
  next.setUTCFullYear(year, month, 1);
  next.setUTCDate(Math.min(day, daysInMonth(next.getUTCFullYear(), next.getUTCMonth())));
  return next;
}

/**
 * Produces the dates to be materialized for a recurrence. Keeping this pure
 * prevents the finance action from mixing calendar rules with persistence.
 */
export function getFinancialRecurrenceDates(startsAt: Date, frequency: FinancialRecurrenceFrequency, endsAt?: Date | null) {
  const limit = endsAt ?? new Date(startsAt.getUTCFullYear() + 1, startsAt.getUTCMonth(), startsAt.getUTCDate());
  const dates: Date[] = [];
  for (let dueDate = startsAt; dueDate <= limit; dueDate = getNextFinancialRecurrenceDate(dueDate, frequency)) {
    dates.push(dueDate);
  }
  return dates;
}
