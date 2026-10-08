export type PortalDueUrgency = "overdue" | "soon" | "normal";

/** Calendar-day comparison; the warning starts exactly three days before due date. */
export function getPortalDueUrgency(dueDate: Date | null, today: Date, status?: string): PortalDueUrgency {
  if (status === "OVERDUE") return "overdue";
  if (!dueDate) return "normal";
  const day = (value: Date) => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  const daysUntilDue = Math.round((day(dueDate) - day(today)) / 86_400_000);
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 3) return "soon";
  return "normal";
}
