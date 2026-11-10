import { getDiscountedAmountCents, type FinancialDiscountMode } from "./discounts";
import { parseMoneyToCents } from "./inputs";

export function entryAdjustedAmount(amount: string, discount: string, mode: FinancialDiscountMode, interest: string) {
  const principal = parseMoneyToCents(amount);
  const interestCents = parseMoneyToCents(interest || "0");
  const discountValue = mode === "PERCENTAGE" ? Number(discount.replace(",", ".")) : parseMoneyToCents(discount || "0");
  if (!Number.isSafeInteger(principal) || principal < 0) throw new Error("Informe um valor válido.");
  if (!Number.isFinite(discountValue) || discountValue < 0 || (mode === "PERCENTAGE" && discountValue > 100) || (mode === "AMOUNT" && discountValue > principal)) throw new Error("Informe um desconto válido, limitado ao valor do lançamento.");
  if (!Number.isSafeInteger(interestCents) || interestCents < 0) throw new Error("Informe juros válidos, maiores ou iguais a zero.");
  const amountCents = getDiscountedAmountCents(principal,discountValue,mode) + interestCents;
  if (!Number.isSafeInteger(amountCents) || amountCents > 2_000_000_000) throw new Error("O valor total do lançamento ultrapassa o limite permitido.");
  return {amountCents, interestCents, principal, discountCents:principal-getDiscountedAmountCents(principal,discountValue,mode)};
}
export function entryAdjustmentNotes(notes:string, adjustment:ReturnType<typeof entryAdjustedAmount>) {
  if (!adjustment.interestCents) return notes;
  const money=(cents:number)=>(cents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  return [notes,`Composição na criação: valor ${money(adjustment.principal)}; desconto ${money(adjustment.discountCents)}; juros ${money(adjustment.interestCents)}; total ${money(adjustment.amountCents)}.`].filter(Boolean).join("\n");
}
