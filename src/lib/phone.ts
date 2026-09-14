/** Chave de comparação para telefones brasileiros, independente de máscara e DDI. */
export function normalizeBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2)
    : digits;
}

export function sameBrazilianPhone(first: string, second: string) {
  const normalizedFirst = normalizeBrazilianPhone(first);
  return Boolean(normalizedFirst) && normalizedFirst === normalizeBrazilianPhone(second);
}
