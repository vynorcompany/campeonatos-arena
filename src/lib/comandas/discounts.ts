export type ComandaDiscountLine = { id: string; amountCents: number };
export type ComandaItemDiscount = { kind: "ITEM" | "DEBT"; id: string; amountCents: number };
export type ComandaDiscountInput = { mode: "TOTAL" | "ITEMS"; discountCents: number; itemDiscounts: readonly ComandaItemDiscount[]; items: readonly ComandaDiscountLine[]; debts: readonly ComandaDiscountLine[] };

/** Allocate cents exactly; only the command's own items and linked reservations qualify. */
export function calculateComandaDiscounts(input: ComandaDiscountInput) {
  const lines = [...input.items.map(line => ({ ...line, kind: "ITEM" as const })), ...input.debts.map(line => ({ ...line, kind: "DEBT" as const }))];
  const key = (line: { kind: string; id: string }) => `${line.kind}:${line.id}`;
  if (!["TOTAL", "ITEMS"].includes(input.mode) || !Number.isSafeInteger(input.discountCents) || input.discountCents < 0 || lines.some(line => !Number.isSafeInteger(line.amountCents) || line.amountCents < 0) || new Set(lines.map(key)).size !== lines.length) throw new Error("Revise os valores do desconto.");
  const gross = lines.reduce((sum, line) => sum + line.amountCents, 0);
  if (!Number.isSafeInteger(gross) || gross > 2_147_483_647) throw new Error("Total da comanda acima do limite permitido.");
  const discounts = new Map<string, number>();
  if (input.mode === "TOTAL") {
    if (input.itemDiscounts.some(line => line.amountCents !== 0)) throw new Error("Escolha desconto por item ou no total, sem acumular os dois.");
    if (input.discountCents > gross) throw new Error("O desconto não pode superar o valor dos itens e reservas desta comanda.");
    const allocations = lines.map((line, index) => {
      const numerator = BigInt(line.amountCents) * BigInt(input.discountCents);
      return { line, index, amount: gross ? Number(numerator / BigInt(gross)) : 0, remainder: gross ? numerator % BigInt(gross) : 0n };
    });
    let remainder = input.discountCents - allocations.reduce((sum, row) => sum + row.amount, 0);
    for (const row of [...allocations].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1)) {
      if (remainder > 0 && row.amount < row.line.amountCents) { row.amount++; remainder--; }
    }
    for (const row of allocations) discounts.set(key(row.line), row.amount);
  } else {
    if (input.discountCents) throw new Error("Escolha desconto por item ou no total, sem acumular os dois.");
    for (const discount of input.itemDiscounts) {
      const id = key(discount), line = lines.find(line => key(line) === id);
      if (!line || discounts.has(id) || !Number.isSafeInteger(discount.amountCents) || discount.amountCents < 0 || discount.amountCents > line.amountCents) throw new Error("Desconto inválido: confira o item e o saldo disponível desta comanda.");
      discounts.set(id, discount.amountCents);
    }
  }
  const result = lines.map(line => { const discountCents = discounts.get(key(line)) ?? 0; return { id: line.id, kind: line.kind, amountCents: line.amountCents, discountCents, netCents: line.amountCents - discountCents }; });
  const items = result.filter(line => line.kind === "ITEM"), debts = result.filter(line => line.kind === "DEBT");
  const productDiscountCents = items.reduce((sum, line) => sum + line.discountCents, 0), debtDiscountCents = debts.reduce((sum, line) => sum + line.discountCents, 0);
  return { discountCents: productDiscountCents + debtDiscountCents, productDiscountCents, debtDiscountCents, items, debts };
}
