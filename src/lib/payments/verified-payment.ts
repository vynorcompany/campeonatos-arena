type ProviderPayment = Record<string, unknown>;

export function verifyApprovedMercadoPagoPayment(payment: ProviderPayment, expectedAmountCents: number, expectedReferences: string[]) {
  const amount = Number(payment.transaction_amount);
  const amountCents = Math.round(amount * 100);
  if (payment.currency_id !== "BRL" || !Number.isFinite(amount) || !Number.isSafeInteger(amountCents) || amountCents <= 0) {
    return { ok: false as const, reason: "Moeda ou valor inválido no pagamento aprovado." };
  }
  if (!expectedReferences.includes(String(payment.external_reference ?? ""))) {
    return { ok: false as const, reason: "A referência do pagamento não corresponde à cobrança." };
  }
  if (amountCents !== expectedAmountCents) {
    return { ok: false as const, reason: `Valor recebido (${amountCents} centavos) difere do esperado (${expectedAmountCents} centavos).` };
  }
  return { ok: true as const, amountCents };
}
