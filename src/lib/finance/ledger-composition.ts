import { FinanceOperationError } from "@/lib/finance/action-error";
export type LedgerComposition = {
  originalCents: number; interestCents: number; discountCents: number;
  adjustedCents: number; creationKnown: boolean;
};
type Entry = {
  amountCents: number; source?: string; status?: string;
  originalAmountCents?: number | null; creationInterestCents?: number | null; creationDiscountCents?: number | null;
  composition?: LedgerComposition;
  settlements?: readonly { amountCents?: number; interestCents?: number; discountCents?: number }[];
};

function hasStoredCreationComposition(entry: Entry) {
  return [entry.originalAmountCents, entry.creationInterestCents, entry.creationDiscountCents].every(value => Number.isSafeInteger(value) && Number(value) >= 0)
    && Number(entry.originalAmountCents) + Number(entry.creationInterestCents) - Number(entry.creationDiscountCents) === entry.amountCents;
}

// amountCents already includes adjustments at creation. Settlement adjustments
// are additional: they must be counted once, and payments do not reduce this total.
export function getLedgerComposition(entry: Entry): LedgerComposition {
  if (entry.composition) return entry.composition;
  const { originalAmountCents: original, creationInterestCents: interest, creationDiscountCents: discount } = entry;
  const known = hasStoredCreationComposition(entry);
  const settlementInterest = (entry.settlements ?? []).reduce((sum, row) => sum + (row.interestCents ?? 0), 0);
  const settlementDiscount = (entry.settlements ?? []).reduce((sum, row) => sum + (row.discountCents ?? 0), 0);
  return {
    originalCents: known ? original! : entry.amountCents,
    interestCents: (known ? interest! : 0) + settlementInterest,
    discountCents: (known ? discount! : 0) + settlementDiscount,
    adjustedCents: entry.amountCents + settlementInterest - settlementDiscount,
    creationKnown: known || Boolean(entry.source && entry.source !== "MANUAL"),
  };
}

export function sumLedgerCompositions(entries: readonly Entry[]) {
  return entries.filter(entry => entry.status !== "VOIDED" && entry.source !== "AGENCY_SUBSCRIPTION").reduce((sum, entry) => {
    const value = getLedgerComposition(entry);
    return {
      originalCents: sum.originalCents + value.originalCents,
      interestCents: sum.interestCents + value.interestCents,
      discountCents: sum.discountCents + value.discountCents,
      adjustedCents: sum.adjustedCents + value.adjustedCents,
      unknownCount: sum.unknownCount + Number(!value.creationKnown),
    };
  }, { originalCents: 0, interestCents: 0, discountCents: 0, adjustedCents: 0, unknownCount: 0 });
}

export function creationComposition(adjustment: { principal: number; interestCents: number; discountCents: number }) {
  return { originalAmountCents: adjustment.principal, creationInterestCents: adjustment.interestCents, creationDiscountCents: adjustment.discountCents };
}

// The editor changes the original amount; adjustments at creation remain intact.
// Read their authoritative values from the locked entry, never hidden form fields.
export function revisedLedgerOriginal(entry: Entry, originalCents: number) {
  if (!Number.isSafeInteger(originalCents) || originalCents < 0 || originalCents > 2_000_000_000) throw new FinanceOperationError("Informe um valor original válido.");
  if (!hasStoredCreationComposition(entry)) return { amountCents: originalCents };
  if (originalCents < entry.creationDiscountCents!) throw new FinanceOperationError("O valor original não pode ser menor que o desconto da criação.");
  const amountCents = originalCents + entry.creationInterestCents! - entry.creationDiscountCents!;
  if (amountCents > 2_000_000_000) throw new FinanceOperationError("O valor ajustado ultrapassa o limite permitido.");
  return { amountCents, originalAmountCents: originalCents };
}

// Largest-remainder allocation keeps each component exact to the cent, including
// uneven/custom installments. Never copy a full-series adjustment to every row.
export function installmentCompositions(entry: Entry, amounts: readonly number[]) {
  const value = getLedgerComposition({ ...entry, composition: undefined, settlements: [] });
  if (!value.creationKnown || entry.originalAmountCents == null || entry.amountCents <= 0 || amounts.some(amount => !Number.isSafeInteger(amount) || amount < 1) || amounts.reduce((sum, amount) => sum + amount, 0) !== entry.amountCents) {
    return amounts.map(() => ({ originalAmountCents: null, creationInterestCents: null, creationDiscountCents: null }));
  }
  const allocate = (total: number) => {
    const denominator = BigInt(entry.amountCents);
    const rows = amounts.map((amount, index) => {
      const numerator = BigInt(total) * BigInt(amount);
      return { index, cents: Number(numerator / denominator), remainder: numerator % denominator };
    });
    let remaining = total - rows.reduce((sum, row) => sum + row.cents, 0);
    for (const row of [...rows].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1)) {
      if (remaining-- <= 0) break;
      row.cents++;
    }
    return rows.map(row => row.cents);
  };
  const interests = allocate(value.interestCents), discounts = allocate(value.discountCents);
  return amounts.map((amount, index) => ({ originalAmountCents: amount - interests[index] + discounts[index], creationInterestCents: interests[index], creationDiscountCents: discounts[index] }));
}
