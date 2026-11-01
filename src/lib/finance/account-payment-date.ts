const paymentCalendar = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" });

/** Actual most recent settlement, including legacy paid entries without settlement rows. */
export function accountLastPaymentDate(entry: { paidAt: Date | null; settlements: { paidAt: Date }[] }) {
  const dates = [...entry.settlements.map(settlement => settlement.paidAt), ...(entry.paidAt ? [entry.paidAt] : [])];
  if (!dates.length) return null;
  return paymentCalendar.format(new Date(Math.max(...dates.map(date => date.getTime()))));
}
