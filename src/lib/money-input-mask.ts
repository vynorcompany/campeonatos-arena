/** BRL keyboard mask; pasted amounts retain their decimal meaning. */
export function formatMaskedMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.max(0, cents) / 100);
}
export function moneyDigitsToCents(value: string) {
  return Math.min(Number.MAX_SAFE_INTEGER, Number(value.replace(/\D/g, "")) || 0);
}
export function pastedMoneyToCents(value: string) {
  const clean = value.replace(/[^\d,.-]/g, "");
  const decimal = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : /^\d+\.\d{1,2}$/.test(clean) ? clean : clean.replace(/\./g, "");
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.round((Number(decimal) || 0) * 100)));
}
