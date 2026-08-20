type Settlement = {
  amountCents: number;
  interestCents?: number;
};

export function getFinancialEntryBalance(originalCents: number, settlements: Settlement[], status?: string) {
  const interestCents = settlements.reduce((total, settlement) => total + (settlement.interestCents ?? 0), 0);
  const paidCents = settlements.length || status !== "PAID"
    ? settlements.reduce((total, settlement) => total + settlement.amountCents, 0)
    : originalCents;
  const outstandingCents = Math.max(0, originalCents + interestCents - paidCents);

  return {
    originalCents,
    interestCents,
    paidCents,
    outstandingCents,
    settled: outstandingCents === 0
  };
}
