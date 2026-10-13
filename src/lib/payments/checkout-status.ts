export function isPendingCheckoutStatus(status: string) {
  return ["PENDING", "IN_PROCESS", "AUTHORIZED"].includes(status.toUpperCase());
}

export function checkoutStatusLabel(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "PAID") return "Confirmado";
  if (normalized === "REVIEW") return "Em análise — conferir no Mercado Pago";
  if (status === "REFUNDED") return "Estornado · nova tentativa liberada";
  if (normalized === "REFUNDED") return "Estornado no provedor · conferir";
  if (normalized === "CHARGED_BACK") return "Contestação · conferir";
  if (["FAILED", "REJECTED", "CANCELLED", "CANCELED"].includes(normalized)) return "Falhou";
  return "Pendente";
}
