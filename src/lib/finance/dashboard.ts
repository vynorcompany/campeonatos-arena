type RevenueEntry = {
  type: string;
  status: string;
  amountCents: number;
  paidAt: Date | null;
  settlements: Array<{ amountCents: number; paidAt: Date }>;
};

function isWithinRange(value: Date, start: Date, end: Date) {
  return value >= start && value < end;
}

export function getReceivedRevenueCents(entries: RevenueEntry[], start: Date, end: Date) {
  return entries.reduce((total, entry) => {
    if (entry.type !== "REVENUE") {
      return total;
    }

    if (entry.settlements.length) {
      return total + entry.settlements
        .filter((settlement) => isWithinRange(settlement.paidAt, start, end))
        .reduce((subtotal, settlement) => subtotal + settlement.amountCents, 0);
    }

    return entry.status === "PAID" && entry.paidAt && isWithinRange(entry.paidAt, start, end)
      ? total + entry.amountCents
      : total;
  }, 0);
}
