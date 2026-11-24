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

/** Items outside a selected split remain on the holder, without creating or losing a cent. */
export function includeUnselectedComandaItems(parts: readonly ComandaShare[], selectedTotalCents: number, totalCents: number) {
  if (!Number.isSafeInteger(selectedTotalCents) || !Number.isSafeInteger(totalCents) || selectedTotalCents < 0 || selectedTotalCents > totalCents) throw new Error("Seleção de itens inválida para divisão.");
  allocateComandaShares(parts, selectedTotalCents, 0, 0);
  return parts.map((part, index) => ({ ...part, amountCents: part.amountCents + (index === 0 ? totalCents - selectedTotalCents : 0) }));
}

/** Exact matrix: each person's share and each charge retain their total. */
export function allocateComandaLines(shares: readonly ComandaShare[], lines: readonly { id: string; amountCents: number }[]) {
  const total = lines.reduce((sum, line) => sum + line.amountCents, 0);
  if (!Number.isSafeInteger(total) || lines.some(line => !Number.isSafeInteger(line.amountCents) || line.amountCents < 0) || new Set(lines.map(line => line.id)).size !== lines.length) throw new Error("Valores inválidos para divisão.");
  allocateComandaShares(shares, total, 0, 0);
  const remaining = shares.map(share => share.amountCents);
  return lines.map(line => {
    const available = remaining.reduce((sum, amount) => sum + amount, 0);
    const amounts = remaining.map(amount => available ? Number(BigInt(amount) * BigInt(line.amountCents) / BigInt(available)) : 0);
    let residue = line.amountCents - amounts.reduce((sum, amount) => sum + amount, 0);
    const order = remaining.map((amount, index) => ({index, fraction: available ? BigInt(amount) * BigInt(line.amountCents) % BigInt(available) : 0n})).sort((a,b) => a.fraction === b.fraction ? a.index-b.index : a.fraction > b.fraction ? -1 : 1);
    for (const {index} of order) if (residue && amounts[index] < remaining[index]) { amounts[index]++; residue--; }
    if (residue) throw new Error("Não foi possível distribuir os centavos da divisão.");
    amounts.forEach((amount,index) => { remaining[index] -= amount; });
    return { id: line.id, parts: shares.map((share,index) => ({...share,amountCents:amounts[index]})) };
  });
}
