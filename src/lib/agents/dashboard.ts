import { buildDashboardAnalytics } from "@/lib/reports/dashboard-analytics";
import { loadDashboardData } from "@/lib/reports/dashboard-data";
import { dashboardPeriod } from "@/lib/reports/dashboard-period";
import { withArenaTransaction } from "@/lib/rls";

/** Same period, loader and calculations as /painel; never exports contact details. */
export async function readAgentDashboard(arenaId: string, month: string, view: "caixa" | "competencia") {
  const [year, number] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const period = dashboardPeriod(`${month}-01`, `${month}-${lastDay}`);
  if (period.error) throw new Error(period.error);
  const { from, to, horizonEnd } = period;
  const data = await loadDashboardData(arenaId, from, to, horizonEnd);
  const analytics = buildDashboardAnalytics(data, from, to, horizonEnd, view);
  const studentSnapshot = await withArenaTransaction(arenaId, async tx => ({
    active: await tx.student.count({ where: { arenaId, active: true } }),
    asOf: new Date().toISOString(),
    definition: "Cadastro Student com active=true agora; não representa alunos ativos históricos no período.",
  }));
  return {
    source: { system: "arena", company: arenaId }, period_month: month, currency: "BRL",
    scope: "reports:read", view, calculatedAt: new Date().toISOString(),
    definition: "Mesmos cálculos e filtros do Dashboard /painel para o período e visão selecionados.",
    metrics: analytics.cards.map(({ id, label, value, secondary, caption, description }) => ({ id, label, value, secondary, caption, description })),
    reports: { courtRevenue: analytics.courtRevenue, courtReservations: analytics.courtReservations,
      forecastCourts: analytics.forecastCourts, categories: analytics.categories, methods: analytics.methods,
      forecastMonths: analytics.months, lessonsByTeacher: analytics.lessonsByTeacher, products: analytics.products,
      cashDays: analytics.cashDays },
    studentSnapshot,
    limitations: ["Projeções não representam recebimentos confirmados.", "Visão por vencimento do Dashboard não equivale a DRE contábil aprovada.", "Alunos ativos e clientes ativos são indicadores diferentes."],
  };
}
