export type FinancialRecurrenceFrequency = "WEEKLY" | "MONTHLY" | "ANNUAL";

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Calculates an occurrence from the original date so short months do not shift later due dates. */
export function getFinancialRecurrenceDateAt(startsAt: Date, frequency: FinancialRecurrenceFrequency, index: number) {
  if (!Number.isInteger(index) || index < 0) throw new Error("Índice de recorrência inválido.");
  const next = new Date(startsAt);
  if (frequency === "WEEKLY") {
    next.setUTCDate(next.getUTCDate() + 7 * index);
    return next;
  }

  const day = startsAt.getUTCDate();
  const year = startsAt.getUTCFullYear() + (frequency === "ANNUAL" ? index : 0);
  const month = frequency === "ANNUAL" ? startsAt.getUTCMonth() : startsAt.getUTCMonth() + index;
  next.setUTCDate(1);
  next.setUTCFullYear(year, month, 1);
  next.setUTCDate(Math.min(day, daysInMonth(next.getUTCFullYear(), next.getUTCMonth())));
  return next;
}

export function getNextFinancialRecurrenceDate(current: Date, frequency: FinancialRecurrenceFrequency) {
  return getFinancialRecurrenceDateAt(current, frequency, 1);
}

/**
 * Produces the dates to be materialized for a recurrence. Keeping this pure
 * prevents the finance action from mixing calendar rules with persistence.
 */
export function getFinancialRecurrenceDates(startsAt: Date, frequency: FinancialRecurrenceFrequency, endsAt?: Date | null) {
  const limit = endsAt ?? new Date(startsAt.getUTCFullYear() + 1, startsAt.getUTCMonth(), startsAt.getUTCDate());
  const dates: Date[] = [];
  for (let index = 0; ; index += 1) {
    const dueDate = getFinancialRecurrenceDateAt(startsAt, frequency, index);
    if (dueDate > limit) break;
    dates.push(dueDate);
  }
  return dates;
}
