export type ComandaShare = { playerId: string | null; amountCents: number };

/** Allocate receipts once, keeping client credit exclusively on the owner's part. */
export function allocateComandaShares(shares: readonly ComandaShare[], totalCents: number, paymentCents: number, creditCents: number) {
  if (!shares.length || shares.length > 20 || shares.some(share => !Number.isSafeInteger(share.amountCents) || share.amountCents < 0)) throw new Error("Informe valores válidos para a divisão.");
  if (new Set(shares.map(share => share.playerId)).size !== shares.length) throw new Error("Cada pessoa deve aparecer uma única vez na divisão.");
  if (shares.reduce((sum, share) => sum + share.amountCents, 0) !== totalCents) throw new Error("A soma das partes deve ser igual ao valor da comanda.");
  if (!Number.isSafeInteger(paymentCents) || paymentCents < 0 || !Number.isSafeInteger(creditCents) || creditCents < 0 || creditCents > shares[0].amountCents || paymentCents + creditCents > totalCents) throw new Error("Os pagamentos e o saldo utilizado excedem as partes da comanda.");
  let availablePayment = paymentCents;
  return shares.map((share, index) => {
    const credit = index === 0 ? creditCents : 0;
    const paidCents = Math.min(availablePayment, share.amountCents - credit);
    availablePayment -= paidCents;
    return { ...share, paidCents, creditCents: credit, outstandingCents: share.amountCents - paidCents - credit };
  });
}

export function equalComandaShares(totalCents: number, people: number) {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0 || !Number.isInteger(people) || people < 1 || people > 20) throw new Error("Divisão inválida.");
  const base = Math.floor(totalCents / people);
  return Array.from({ length: people }, (_, index) => base + (index < totalCents % people ? 1 : 0));
}
