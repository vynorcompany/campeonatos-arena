export function mobileFinanceAttention({ overdueCount, hasSoonPayment, openComandaCount }: {
  overdueCount: number;
  hasSoonPayment: boolean;
  openComandaCount: number;
}) {
  if (overdueCount > 0) return { kind: "overdue", message: "Há pagamento em atraso" } as const;
  if (hasSoonPayment) return { kind: "soon", message: "Há pagamento vencendo em até 3 dias" } as const;
  if (openComandaCount > 0) return {
    kind: "comanda",
    message: openComandaCount === 1 ? "Você tem uma comanda aberta para acompanhar" : `Você tem ${openComandaCount} comandas abertas para acompanhar`,
  } as const;
  return { kind: "healthy", message: "Seus pagamentos estão em dia" } as const;
}
