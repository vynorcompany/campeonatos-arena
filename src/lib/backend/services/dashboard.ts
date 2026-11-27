import "server-only";
import { loadDashboardData } from "@/lib/reports/dashboard-data";
import { buildDashboardAnalytics } from "@/lib/reports/dashboard-analytics";
import { dashboardPeriod, shiftDashboardPeriod } from "@/lib/reports/dashboard-period";
import { dashboardProjectedCost } from "@/lib/reports/dashboard-projections";
import { dashboardQuerySchema, dashboardOverviewSchema, type DashboardQuery } from "@/lib/backend/contracts/dashboard";

export async function resolveDashboardOverview(arenaId: string, input: DashboardQuery) {
  const query = dashboardQuerySchema.parse(input);
  const period = dashboardPeriod(query.dataInicial, query.dataFinal);
  if (period.error) return { error: period.error };
  const { from, to, horizonEnd } = period;
  const view = query.visao === 'competencia' ? 'competencia' : 'caixa';
  const comparing = ['previous-month', 'previous-year', 'custom'].includes(query.comparar || '');
  const shifted = shiftDashboardPeriod(from, to, query.comparar === 'previous-year' ? -12 : -1);
  const custom = query.comparar === 'custom' ? dashboardPeriod(query.compararDataInicial, query.compararDataFinal) : null;
  if (custom?.error) return { error: `Período de comparação inválido. ${custom.error}` };
  const previous = custom && !custom.error ? { from: custom.from, to: custom.to } : shifted;
  const data = await loadDashboardData(arenaId, from, to, horizonEnd, comparing ? previous.from : undefined, comparing ? previous.to : undefined);
  return dashboardOverviewSchema.parse({
    analytics: buildDashboardAnalytics(data, from, to, horizonEnd, view, comparing ? previous : undefined),
    fixedCostCents: dashboardProjectedCost(data.entries, data.recurrences, from, to),
    forecastCostCents: dashboardProjectedCost(data.entries, data.recurrences, from, horizonEnd),
  });
}
