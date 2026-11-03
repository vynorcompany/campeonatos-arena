/** Future installments must not replace this month's payment status. */
export function currentPlanBill<T extends { dueDate: Date | null; status: string }>(entries: T[], today: Date): T | undefined {
  const active = entries.filter(entry => entry.status !== "VOIDED");
  const candidates = active.length ? active : entries;
  const dated = candidates.filter((entry): entry is T & { dueDate: Date } => entry.dueDate !== null);
  const newest = (items: (T & { dueDate: Date })[]) => items.sort((a,b)=>b.dueDate.getTime()-a.dueDate.getTime())[0];
  return newest(dated.filter(entry=>entry.dueDate.getFullYear()===today.getFullYear() && entry.dueDate.getMonth()===today.getMonth()))
    ?? newest(dated.filter(entry=>entry.dueDate<=today))
    ?? dated.sort((a,b)=>a.dueDate.getTime()-b.dueDate.getTime())[0]
    ?? candidates[0];
}
