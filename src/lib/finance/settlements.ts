export type DebtBalance = {
  financialEntryId: string;
  outstandingCents: number;
};

export type PaymentAmount = {
  paymentMethod: string;
  amountCents: number;
};

export function getOutstandingCents(
  amountCents: number,
  settlements: Array<{ amountCents: number }>
) {
  const settledCents = settlements.reduce((total, settlement) => total + settlement.amountCents, 0);
  return Math.max(0, amountCents - settledCents);
}

export function allocatePaymentsToDebts(debts: DebtBalance[], payments: PaymentAmount[]) {
  let debtIndex = 0;
  let outstandingCents = debts[0]?.outstandingCents ?? 0;
  const settlements: Array<PaymentAmount & { financialEntryId: string }> = [];
  const remainingPayments: PaymentAmount[] = [];

  for (const payment of payments) {
    let remainingCents = payment.amountCents;
    while (remainingCents > 0 && debtIndex < debts.length) {
      const paidCents = Math.min(remainingCents, outstandingCents);
      if (paidCents > 0) {
        settlements.push({
          financialEntryId: debts[debtIndex].financialEntryId,
          paymentMethod: payment.paymentMethod,
          amountCents: paidCents
        });
        remainingCents -= paidCents;
        outstandingCents -= paidCents;
      }
      if (outstandingCents === 0) {
        debtIndex += 1;
        outstandingCents = debts[debtIndex]?.outstandingCents ?? 0;
      }
    }
    if (remainingCents > 0) {
      remainingPayments.push({ paymentMethod: payment.paymentMethod, amountCents: remainingCents });
    }
  }

  return { settlements, remainingPayments };
}
