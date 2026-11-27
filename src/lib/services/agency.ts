import { getAgencyMetricsPage } from "@/lib/agency/pages";

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(cents / 100);
}

export const getAgencyMetrics = getAgencyMetricsPage;
