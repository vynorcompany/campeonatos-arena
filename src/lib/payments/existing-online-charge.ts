export function hasExistingOnlineCharge(entry: { onlinePaymentId: string; onlinePaymentUrl: string }) {
  return Boolean(entry.onlinePaymentId || entry.onlinePaymentUrl);
}
