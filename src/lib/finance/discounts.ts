export type FinancialDiscountMode = "AMOUNT" | "PERCENTAGE";

export function getDiscountedAmountCents(amountCents: number, discount: number, mode: FinancialDiscountMode) {
  const safeAmount = Math.max(0, Math.round(amountCents));
  const safeDiscount = Math.max(0, Number.isFinite(discount) ? discount : 0);
  return mode === "PERCENTAGE"
    ? Math.max(0, Math.round(safeAmount * (1 - Math.min(safeDiscount, 100) / 100)))
    : Math.max(0, safeAmount - Math.round(safeDiscount));
}
