import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardComparisonFilter } from "@/components/dashboard-comparison-filter";
import { DashboardMetricCards } from "@/components/dashboard-metric-cards";
import { DashboardSortablePanels } from "@/components/dashboard-sortable-panels";
import { DashboardBarPanel } from "@/components/dashboard-bar-panel";
import { SectionCard } from "@/components/section-card";
import { requireArenaAccess } from "@/lib/auth/session";
import { canViewModule, firstVisibleModuleHref } from "@/lib/permissions";
import { loadDashboardData } from "@/lib/reports/dashboard-data";
import { buildDashboardAnalytics } from "@/lib/reports/dashboard-analytics";
import { dashboardPeriod, shiftDashboardPeriod } from "@/lib/reports/dashboard-period";
import { dashboardDateKey } from "@/lib/reports/dashboard-projections";
import { DashboardFlowPanel } from "./dashboard-flow-panel";

type DashboardQuery = { dataInicial?: string; dataFinal?: string; visao?: string; comparar?: string; compararDataInicial?: string; compararDataFinal?: string };
export default async function OverviewPage({ searchParams }: { searchParams: Promise<DashboardQuery> }) {
  const auth = await requireArenaAccess();
  if (!canViewModule("dashboard", auth.arenaRole, auth.systemRole, auth.viewPermissions)) redirect(firstVisibleModuleHref(auth.arenaRole, auth.systemRole, auth.viewPermissions));
  const query = await searchParams;
  const period = dashboardPeriod(query.dataInicial, query.dataFinal);
  if (period.error) return <section className="tw:grid tw:gap-3 tw:p-4"><p role="alert">{period.error}</p><Link href="/painel">Voltar ao Dashboard</Link></section>;
  const { from, to, horizonEnd, today } = period;
  const view = query.visao === "competencia" ? "competencia" : "caixa";
  const comparing = ["previous-month", "previous-year", "custom"].includes(query.comparar || "");
  const shifted = shiftDashboardPeriod(from, to, query.comparar === "previous-year" ? -12 : -1);
  const custom = query.comparar === "custom" ? dashboardPeriod(query.compararDataInicial, query.compararDataFinal) : null;
  const previous = custom && !custom.error ? { from: custom.from, to: custom.to } : shifted;
  if (custom?.error) return <section className="tw:grid tw:gap-3 tw:p-4"><p role="alert">Período de comparação inválido. {custom.error}</p><Link href="/painel">Voltar ao Dashboard</Link></section>;
  const data = await loadDashboardData(auth.arenaId, from, to, horizonEnd, comparing ? previous.from : undefined, comparing ? previous.to : undefined);
  const analytics = buildDashboardAnalytics(data, from, to, horizonEnd, view, comparing ? previous : undefined);
  const presetHref = (start: Date, end: Date) => {
    const params = new URLSearchParams({ dataInicial: dashboardDateKey(start), dataFinal: dashboardDateKey(end), visao: view });
    if (comparing) { params.set("comparar", query.comparar!); if (query.comparar === "custom") { params.set("compararDataInicial", query.compararDataInicial || ""); params.set("compararDataFinal", query.compararDataFinal || ""); } }
    return `/painel?${params}`;
  };
  const month = today.getMonth(), year = today.getFullYear();
  const presets: Array<[string, Date, Date]> = [
    ["Este mês", new Date(year, month, 1), today],
    ["Próximo Mês", new Date(year, month + 1, 1), new Date(year, month + 2, 0)],
    ["Mês passado", new Date(year, month - 1, 1), new Date(year, month, 0)],
    ["Últimos 90 dias", new Date(year, month, today.getDate() - 89), today],
    ["Últimos 7 dias", new Date(year, month, today.getDate() - 6), today],
  ];
  const panels = [
    { id: "payments", title: "Principais formas de pagamento", description: "Recebimentos no período, incluindo baixas parciais, agrupados pela forma efetiva do pagamento.", items: analytics.methods },
    { id: "categories", title: "Faturamento por categoria", description: "Receitas na visão de caixa ou competência selecionada, agrupadas pela categoria financeira do lançamento.", items: analytics.categories },
    { id: "court-revenue", title: "Faturamento por quadra", description: "Receitas na visão selecionada. Reservas com várias quadras são rateadas igualmente; demais receitas aparecem em Sem quadra vinculada.", items: analytics.courtRevenue },
    { id: "court-forecast", title: "Previsão de faturamento por quadra", description: "Receitas lançadas e programadas por vencimento, incluindo reservas já agendadas. Valores de reservas com várias quadras são rateados; receitas sem vínculo ficam identificadas separadamente.", items: analytics.forecastCourts },
    { id: "total-forecast", title: "Previsão de faturamento total", description: `Receitas lançadas e programadas por vencimento, de ${dashboardDateKey(from)} a ${dashboardDateKey(horizonEnd)}. Inclui lançamentos, recorrências ativas e reservas com valor definido. O primeiro mês começa na data inicial do filtro. Não estima novas vendas.`, items: analytics.months, chronological: true },
    { id: "teachers", title: "Aulas por professor", description: "Quantidade de aulas não canceladas da grade e do cadastro de aulas avulsas, no período.", items: analytics.lessonsByTeacher, monetary: false },
    { id: "clients", title: "Top 10 Clientes", description: "Dez clientes com mais recebimentos confirmados no período, incluindo pagamentos parciais. Registros sem vínculo usam o nome informado no lançamento.", items: analytics.clients },
    { id: "debtors", title: "Top 10 Devedores", description: "Dez maiores saldos vencidos das contas com vencimento no período selecionado, descontando pagamentos parciais.", items: analytics.debtors },
    { id: "courts", title: "Quadras com mais reservas", description: "Agendamentos ativos por quadra, incluindo aulas, sem bloqueios nem cancelamentos.", items: analytics.courtReservations, monetary: false },
    { id: "products", title: "Produtos mais vendidos", description: "Quantidade de produtos vendidos no período. Serviços são apresentados nos indicadores de receitas.", items: analytics.products, monetary: false },
  ];
  return <div className={viewStyles.stack_md_workspace_page}>
    <h1 className="tw:sr-only">Dashboard</h1>
    <header className={viewStyles.page_header_dashboard_header}><form key={`${dashboardDateKey(from)}:${dashboardDateKey(to)}:${view}:${query.comparar || "none"}`} className={viewStyles.dashboard_filters}>
      <div className={viewStyles.dashboard_presets}>{presets.map(([label, start, end]) => <Link key={label} href={presetHref(start, end)} className={cx(dashboardDateKey(from) === dashboardDateKey(start) && dashboardDateKey(to) === dashboardDateKey(end) ? "dashboard-period-preset-active" : undefined)}>{label}</Link>)}</div>
      <label>Período inicial<input type="date" name="dataInicial" defaultValue={dashboardDateKey(from)} required /></label><label>Período final<input type="date" name="dataFinal" defaultValue={dashboardDateKey(to)} required /></label><label>Visualização<select name="visao" defaultValue={view}><option value="caixa">Visão de caixa</option><option value="competencia">Visão de competência</option></select></label><DashboardComparisonFilter mode={query.comparar} from={dashboardDateKey(previous.from)} to={dashboardDateKey(previous.to)} /><button type="submit" className={viewStyles.button_button_primary}>Aplicar</button>
    </form></header>
    <SectionCard title="Resumo financeiro" className={viewStyles.dashboard_financial_summary}><div className="stats-grid tw:grid tw:min-w-0 tw:grid-cols-4 tw:gap-3 tw:viewport-1120:grid-cols-3 tw:viewport-900:grid-cols-2 tw:viewport-580:grid-cols-1"><DashboardMetricCards cards={analytics.cards.slice(0, 8)} storageScope={`${auth.arenaId}:finance`} /></div></SectionCard>
    <SectionCard title="Operação" className="tw:min-w-0"><div className="tw:grid tw:min-w-0 tw:grid-cols-4 tw:gap-3 tw:viewport-1120:grid-cols-3 tw:viewport-900:grid-cols-2 tw:viewport-580:grid-cols-1"><DashboardMetricCards cards={analytics.cards.slice(8)} storageScope={`${auth.arenaId}:operations`} /></div></SectionCard>
    <DashboardFlowPanel days={analytics.cashDays} view={view} arenaId={auth.arenaId} />
    <DashboardSortablePanels storageScope={auth.arenaId}>{panels.map(panel => <DashboardBarPanel key={panel.id} {...panel} arenaId={auth.arenaId} />)}</DashboardSortablePanels>
  </div>;
}
