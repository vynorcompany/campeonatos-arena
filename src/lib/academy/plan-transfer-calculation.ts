const DAY = 86_400_000;
export function dateOnly(value: string | Date) {
  const text = typeof value === "string" ? value : value.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("Data inválida.");
  const date = new Date(`${text}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== text) throw new Error("Data inválida.");
  return date;
}
export function cycleDate(year: number, month: number, day: number) {
  const start = new Date(Date.UTC(year, month, 1, 12));
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(day, last));
  return start;
}
export function transferCycle(today: Date, dueDay: number) {
  let end = cycleDate(today.getUTCFullYear(), today.getUTCMonth(), dueDay);
  if (end <= today) end = cycleDate(today.getUTCFullYear(), today.getUTCMonth() + 1, dueDay);
  const start = cycleDate(end.getUTCFullYear(), end.getUTCMonth() - 1, dueDay);
  return { start, end };
}
export function calculatePlanTransfer(input: { today: Date; cycleStart: Date; currentDueDate: Date; newDueDate: Date; oldPriceCents: number; newPriceCents: number }) {
  const { today, cycleStart, currentDueDate, newDueDate, oldPriceCents, newPriceCents } = input;
  const cycleDays = Math.round((currentDueDate.getTime() - cycleStart.getTime()) / DAY);
  const remainingDays = Math.round((currentDueDate.getTime() - today.getTime()) / DAY);
  const newDays = Math.round((newDueDate.getTime() - today.getTime()) / DAY);
  if (![cycleDays, remainingDays, newDays, oldPriceCents, newPriceCents].every(Number.isSafeInteger) || cycleDays <= 0 || remainingDays < 0 || remainingDays > cycleDays || newDays < 1 || newDays > 62 || Math.min(oldPriceCents, newPriceCents) < 0) throw new Error("Informe um vencimento entre amanhã e os próximos 62 dias.");
  const planDifferenceCents = Math.round((newPriceCents - oldPriceCents) * remainingDays / cycleDays);
  const dueDateDifferenceCents = Math.round(newPriceCents * (newDays - remainingDays) / cycleDays);
  return { cycleDays, remainingDays, newDays, planDifferenceCents, dueDateDifferenceCents, differenceCents: planDifferenceCents + dueDateDifferenceCents };
}
