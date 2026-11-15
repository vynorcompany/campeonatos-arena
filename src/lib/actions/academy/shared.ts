import "server-only";

export const referenceMonth = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;

export function parseFormDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getFirstDueDate(startedAt: Date, dueDay: number) {
  const dueDate = new Date(
    startedAt.getFullYear(),
    startedAt.getMonth(),
    Math.min(dueDay, 28),
    12,
  );
  return dueDate < startedAt
    ? new Date(
        startedAt.getFullYear(),
        startedAt.getMonth() + 1,
        Math.min(dueDay, 28),
        12,
      )
    : dueDate;
}
