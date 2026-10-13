export function isProviderPaymentFullyReversed(status: unknown) {
  return status === "refunded" || status === "cancelled";
}

export function reviewedPaymentIdsFromNotes(notes: string) {
  return [...notes.matchAll(/\[MP_REVIEW:([^\]\r\n]+)\]/g)].map((match) => match[1]);
}

export function markReviewedPaymentReversed(notes: string, paymentId: string) {
  const marker = `[MP_REVIEW:${paymentId}]`;
  if (!reviewedPaymentIdsFromNotes(notes).includes(paymentId)) return null;
  const remaining = notes.split(/\r?\n/).filter((line) => !line.startsWith(marker));
  remaining.push(`[MP_REFUNDED:${paymentId}] Estorno integral ou cancelamento confirmado no Mercado Pago.`);
  return remaining.join("\n").trim();
}
