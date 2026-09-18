/** Chave de comparação para telefones brasileiros, independente de máscara e DDI. */
export function normalizeBrazilianPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
  // Cadastros antigos frequentemente guardaram celulares de oito dígitos.
  // A forma canônica evita duplicar o atleta quando o Portal recebe o nono
  // dígito, por exemplo 42 8808-5345 e 55 42 98808-5345.
  if (digits.length === 10 && /[6-9]/.test(digits[2] ?? "")) digits = `${digits.slice(0, 2)}9${digits.slice(2)}`;
  return digits;
}

export function sameBrazilianPhone(first: string, second: string) {
  const normalizedFirst = normalizeBrazilianPhone(first);
  return Boolean(normalizedFirst) && normalizedFirst === normalizeBrazilianPhone(second);
}
