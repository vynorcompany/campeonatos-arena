export type PortalDueUrgency = "overdue" | "soon" | "normal";

/** Calendar days: overdue starts the day after the due date, even if a stored status is stale. */
export function getPortalDueUrgency(dueDate: Date | null, today: Date, _status?: string): PortalDueUrgency {
  if (!dueDate) return "normal";
  const day = (value: Date) => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  const daysUntilDue = Math.round((day(dueDate) - day(today)) / 86_400_000);
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 3) return "soon";
  return "normal";
}
