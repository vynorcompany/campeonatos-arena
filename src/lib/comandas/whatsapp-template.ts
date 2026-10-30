export const defaultComandaWhatsappPaidMessage = "Olá, {cliente}! Sua parte na comanda {comanda} da {arena}, no valor de {total}, está quitada. Obrigado!";
export const defaultComandaWhatsappUnpaidMessage = "Olá, {cliente}! A comanda {comanda} da {arena} foi fechada. Sua parte: {total}. Saldo pendente: {pendente}.";
export const defaultComandaWhatsappMessage = "Olá, {cliente}! A comanda {comanda} da {arena} foi fechada. Sua parte: {total}. Situação: {status}. Saldo pendente: {pendente}. Obrigado!";
export function comandaWhatsappText(template: string, values: { cliente: string; comanda: string; arena: string; total: string; pendente: string; status: string }) {
  return (template.trim() || defaultComandaWhatsappMessage).replace(/\{(cliente|comanda|arena|total|pendente|status)\}/g, (_, key: keyof typeof values) => values[key]);
}
