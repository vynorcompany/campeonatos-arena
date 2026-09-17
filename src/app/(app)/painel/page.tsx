import Link from "next/link";
import { DashboardComparisonFilter } from "@/components/dashboard-comparison-filter";
import { DashboardMetricCards } from "@/components/dashboard-metric-cards";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
const dayKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const dayLabel = (value: Date) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(value);
const inputDate = (value: Date) => dayKey(value);

function parseDate(value: string | undefined, fallback: Date) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function ranking(items: Array<{ name: string; value: number }>) {
  return Object.values(items.reduce<Record<string, { name: string; value: number }>>((all, item) => {
    all[item.name] = { name: item.name, value: (all[item.name]?.value ?? 0) + item.value };
    return all;
  }, {})).sort((a, b) => b.value - a.value).slice(0, 5);
}

function comparisonPercent(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

type DashboardSearchParams = Promise<{ dataInicial?: string; dataFinal?: string; visao?: string; comparar?: string; compararDataInicial?: string; compararDataFinal?: string }>;

export default async function OverviewPage({ searchParams }: { searchParams: DashboardSearchParams }) {
  const auth = await requireModuleView("dashboard");
  const query = await searchParams;
  const defaultEnd = new Date(); defaultEnd.setHours(23, 59, 59, 999);
  const defaultStart = new Date(defaultEnd); defaultStart.setDate(defaultStart.getDate() - 29); defaultStart.setHours(0, 0, 0, 0);
  const from = parseDate(query.dataInicial, defaultStart); from.setHours(0, 0, 0, 0);
  const to = parseDate(query.dataFinal, defaultEnd); to.setHours(23, 59, 59, 999);
  const view = query.visao === "competencia" ? "competencia" : "caixa";
  const financialDateField = view === "caixa" ? "paidAt" : "dueDate";
  const financialWhere = view === "caixa"
    ? { arenaId: auth.arenaId, status: "PAID", paidAt: { gte: from, lte: to } }
    : { arenaId: auth.arenaId, status: { not: "VOIDED" }, dueDate: { gte: from, lte: to } };
  const periodDays = Math.max(1, Math.min(93, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1));
  const comparisonMode = query.comparar === "previous-year" || query.comparar === "custom" ? query.comparar : "previous-month";
  const previousFrom = query.comparar === "custom" && query.compararDataInicial ? parseDate(query.compararDataInicial, from) : new Date(from);
  const previousTo = query.comparar === "custom" && query.compararDataFinal ? parseDate(query.compararDataFinal, to) : new Date(to);
  if (comparisonMode === "previous-year") { previousFrom.setFullYear(previousFrom.getFullYear() - 1); previousTo.setFullYear(previousTo.getFullYear() - 1); }
  if (comparisonMode === "previous-month") { previousFrom.setMonth(previousFrom.getMonth() - 1); previousTo.setMonth(previousTo.getMonth() - 1); }
  const previousFinancialWhere = view === "caixa"
    ? { arenaId: auth.arenaId, status: "PAID", paidAt: { gte: previousFrom, lte: previousTo } }
    : { arenaId: auth.arenaId, status: { not: "VOIDED" }, dueDate: { gte: previousFrom, lte: previousTo } };
  const [entries, previousEntries, reservations, previousReservations, saleItems, teachers, portalAccounts, openDebts, paidByClient] = await withArenaTransaction(auth.arenaId, (tx) => Promise.all([
    tx.financialEntry.findMany({ where: financialWhere, select: { id: true, type: true, status: true, amountCents: true, paidAt: true, dueDate: true, description: true, counterpartyName: true } }),
    tx.financialEntry.findMany({ where: previousFinancialWhere, select: { type: true, amountCents: true } }),
    tx.scheduleOccurrence.findMany({ where: { arenaId: auth.arenaId, startsAt: { gte: from, lte: to }, status: { notIn: ["CANCELED", "CANCELLED"] } }, include: { occurrenceCourts: { include: { court: { select: { name: true } } } } } }),
    tx.scheduleOccurrence.findMany({ where: { arenaId: auth.arenaId, startsAt: { gte: previousFrom, lte: previousTo }, status: { notIn: ["CANCELED", "CANCELLED"] } }, select: { id: true } }),
    tx.saleItem.findMany({ where: { sale: { arenaId: auth.arenaId, createdAt: { gte: from, lte: to } } }, select: { quantity: true, totalCents: true, product: { select: { name: true } } } }),
    tx.teacher.findMany({ where: { arenaId: auth.arenaId, active: true }, include: { lessons: { where: { scheduledAt: { gte: from, lte: to } }, include: { attendances: true } } } }),
    tx.playerAccount.findMany({ where: { arenaId: auth.arenaId, createdAt: { gte: from, lte: to } }, select: { id: true, phone: true, createdAt: true, player: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } }),
    tx.financialEntry.findMany({ where: { arenaId: auth.arenaId, type: "REVENUE", status: { in: ["PENDING", "OVERDUE"] } }, select: { id: true, counterpartyName: true, amountCents: true, dueDate: true } }),
    tx.financialEntry.findMany({ where: { arenaId: auth.arenaId, type: "REVENUE", status: "PAID", paidAt: { gte: from, lte: to } }, select: { id: true, counterpartyName: true, amountCents: true, paidAt: true } }),
  ]));
  const received = entries.filter((entry) => entry.type === "REVENUE").reduce((total, entry) => total + entry.amountCents, 0);
  const paid = entries.filter((entry) => entry.type === "EXPENSE").reduce((total, entry) => total + entry.amountCents, 0);
  const previousReceived = previousEntries.filter((entry) => entry.type === "REVENUE").reduce((total, entry) => total + entry.amountCents, 0);
  const previousPaid = previousEntries.filter((entry) => entry.type === "EXPENSE").reduce((total, entry) => total + entry.amountCents, 0);
  const days = Array.from({ length: periodDays }, (_, index) => { const date = new Date(from); date.setDate(from.getDate() + index); return date; });
  const cashDays = days.map((date) => {
    const key = dayKey(date);
    const income = entries.filter((entry) => entry.type === "REVENUE" && entry[financialDateField] && dayKey(entry[financialDateField] as Date) === key).reduce((total, entry) => total + entry.amountCents, 0);
    const expense = entries.filter((entry) => entry.type === "EXPENSE" && entry[financialDateField] && dayKey(entry[financialDateField] as Date) === key).reduce((total, entry) => total + entry.amountCents, 0);
    return { label: dayLabel(date), income, expense };
  });
  const cashMax = Math.max(1, ...cashDays.flatMap((day) => [day.income, day.expense]));
  const courts = ranking(reservations.flatMap((reservation) => reservation.occurrenceCourts.map((court) => ({ name: court.court.name, value: 1 }))));
  const products = ranking(saleItems.map((item) => ({ name: item.product.name, value: item.quantity })));
  const students = ranking(teachers.map((teacher) => ({ name: teacher.name, value: new Set(teacher.lessons.flatMap((lesson) => lesson.attendances.map((attendance) => attendance.studentId))).size })));
  const debtors = ranking(openDebts.map((entry) => ({ name: entry.counterpartyName || "Cliente não identificado", value: entry.amountCents })));
  const bestClients = ranking(paidByClient.map((entry) => ({ name: entry.counterpartyName || "Cliente não identificado", value: entry.amountCents })));
  const maxRanking = Math.max(1, ...courts.map((item) => item.value), ...products.map((item) => item.value), ...students.map((item) => item.value));
  const maxFinancialRanking = Math.max(1, ...debtors.map((item) => item.value), ...bestClients.map((item) => item.value));
  const comparing = query.comparar === "previous-month" || query.comparar === "previous-year" || query.comparar === "custom";
  const metricCards = [
    { id: "income", label: "Entradas", value: money(received), caption: view === "caixa" ? "Valores recebidos" : "Receitas previstas", comparison: comparing ? { percent: comparisonPercent(received, previousReceived) } : undefined, title: "Entradas no período", description: "Receitas consideradas na visualização selecionada.", emptyMessage: "Nenhuma entrada encontrada neste período.", items: entries.filter((entry) => entry.type === "REVENUE").map((entry) => ({ id: entry.id, title: entry.description || "Receita", subtitle: entry.counterpartyName || "Sem identificação", value: money(entry.amountCents), date: (entry[financialDateField] as Date | null)?.toISOString() })) },
    { id: "expense", label: "Saídas", value: money(paid), caption: view === "caixa" ? "Valores pagos" : "Despesas previstas", comparison: comparing ? { percent: comparisonPercent(paid, previousPaid) } : undefined, title: "Saídas no período", description: "Despesas consideradas na visualização selecionada.", emptyMessage: "Nenhuma saída encontrada neste período.", items: entries.filter((entry) => entry.type === "EXPENSE").map((entry) => ({ id: entry.id, title: entry.description || "Despesa", subtitle: entry.counterpartyName || "Sem identificação", value: money(entry.amountCents), date: (entry[financialDateField] as Date | null)?.toISOString() })) },
    { id: "result", label: "Resultado", value: money(received - paid), caption: view === "caixa" ? "Saldo do período" : "Resultado por competência", comparison: comparing ? { percent: comparisonPercent(received - paid, previousReceived - previousPaid) } : undefined, title: "Composição do resultado", description: "Saldo obtido pela diferença entre entradas e saídas do período.", emptyMessage: "Não há movimentações no período.", items: [{ id: "income", title: "Entradas", subtitle: "Receitas do período", value: money(received) }, { id: "expense", title: "Saídas", subtitle: "Despesas do período", value: money(paid) }, { id: "balance", title: "Resultado", subtitle: "Entradas menos saídas", value: money(received - paid) }] },
    { id: "reservations", label: "Reservas", value: reservations.length, caption: "No período", comparison: comparing ? { percent: comparisonPercent(reservations.length, previousReservations.length) } : undefined, title: "Reservas no período", description: "Inclui somente reservas ativas; reservas canceladas ou excluídas não entram nesta lista.", emptyMessage: "Nenhuma reserva encontrada neste período.", items: reservations.map((reservation) => ({ id: reservation.id, title: reservation.title || reservation.bookingTypeName, subtitle: reservation.occurrenceCourts.map((court) => court.court.name).join(" · ") || "Quadra não informada", date: reservation.startsAt.toISOString() })) },
    { id: "portal-users", label: "Novos usuários do portal", value: portalAccounts.length, caption: "Cadastros no período selecionado", title: "Novos usuários do Portal", description: "Usuários que criaram acesso no período selecionado.", emptyMessage: "Nenhum usuário criou acesso ao Portal neste período.", items: portalAccounts.map((account) => ({ id: account.id, title: account.player.name, subtitle: account.phone || account.player.email || "Contato não informado", date: account.createdAt.toISOString() })) },
  ];

  const presetHref = (start: Date, end: Date) => `/painel?dataInicial=${inputDate(start)}&dataFinal=${inputDate(end)}&visao=${view}${comparing ? `&comparar=${query.comparar}` : ""}`;
  const today = new Date(); const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1); const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1); const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const isPreset = (start: Date, end: Date) => inputDate(from) === inputDate(start) && inputDate(to) === inputDate(end);
  return <div className="stack-md workspace-page dashboard-analytics-page">
    <header className="page-header dashboard-header"><div><p className="eyebrow">VISÃO GERAL</p><h1>Saúde da arena</h1></div><form className="dashboard-filters"><div className="dashboard-presets"><Link href={presetHref(thisMonthStart, today)} className={isPreset(thisMonthStart, today) ? "dashboard-period-preset-active" : undefined}>Este mês</Link><Link href={presetHref(lastMonthStart, lastMonthEnd)} className={isPreset(lastMonthStart, lastMonthEnd) ? "dashboard-period-preset-active" : undefined}>Mês passado</Link><Link href={presetHref(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 89), today)} className={isPreset(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 89), today) ? "dashboard-period-preset-active" : undefined}>Últimos 90 dias</Link><Link href={presetHref(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6), today)} className={isPreset(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6), today) ? "dashboard-period-preset-active" : undefined}>Últimos 7 dias</Link></div><label>Período inicial<input type="date" name="dataInicial" defaultValue={inputDate(from)} /></label><label>Período final<input type="date" name="dataFinal" defaultValue={inputDate(to)} /></label><label>Visualização<select name="visao" defaultValue={view}><option value="caixa">Visão de caixa</option><option value="competencia">Visão de competência</option></select></label><DashboardComparisonFilter mode={query.comparar} from={inputDate(previousFrom)} to={inputDate(previousTo)} /><button type="submit" className="button button-primary">Aplicar</button></form></header>
    <SectionCard title="Resumo financeiro" className="dashboard-financial-summary"><div className="stats-grid"><DashboardMetricCards cards={metricCards} /></div></SectionCard>
    <SectionCard title={view === "caixa" ? "Fluxo de caixa diário" : "Fluxo por competência diário"} className="dashboard-cash-flow"><div className="dashboard-chart-legend"><span><i className="dashboard-chart-income" />Entradas</span><span><i className="dashboard-chart-expense" />Saídas</span></div><div className="dashboard-cash-chart" role="img" aria-label={`Gráfico diário de entradas e saídas na visão de ${view}`}><div className="dashboard-cash-bars" style={{ gridTemplateColumns: `repeat(${cashDays.length}, minmax(0, 1fr))` }}>{cashDays.map((day) => <div className="dashboard-cash-day" key={day.label} title={`${day.label}: entradas ${money(day.income)}, saídas ${money(day.expense)}`}><div className="dashboard-cash-column"><span className="dashboard-cash-income" style={{ height: `${Math.max(day.income ? 7 : 0, (day.income / cashMax) * 100)}%` }} /><span className="dashboard-cash-expense" style={{ height: `${Math.max(day.expense ? 7 : 0, (day.expense / cashMax) * 100)}%` }} /></div><small>{day.label}</small></div>)}</div></div></SectionCard>
    <div className="dashboard-grid dashboard-chart-grid">
      <SectionCard title="Quadras com mais reservas"><div className="dashboard-ranking-chart">{courts.map((item) => <div key={item.name}><span>{item.name}</span><i><b style={{ width: `${(item.value / maxRanking) * 100}%` }} /></i><strong>{item.value}</strong></div>)}</div></SectionCard>
      <SectionCard title="Produtos mais vendidos"><div className="dashboard-ranking-chart">{products.map((item) => <div key={item.name}><span>{item.name}</span><i><b style={{ width: `${(item.value / maxRanking) * 100}%` }} /></i><strong>{item.value}</strong></div>)}</div></SectionCard>
      <SectionCard title="Alunos por professor"><div className="dashboard-ranking-chart">{students.map((item) => <div key={item.name}><span>{item.name}</span><i><b style={{ width: `${(item.value / maxRanking) * 100}%` }} /></i><strong>{item.value}</strong></div>)}</div></SectionCard>
      <SectionCard title="Principais devedores" description="Contas em aberto"><div className="dashboard-ranking-chart dashboard-ranking-chart-financial">{debtors.length ? debtors.map((item) => <div key={item.name}><span>{item.name}</span><i><b style={{ width: `${(item.value / maxFinancialRanking) * 100}%` }} /></i><strong>{money(item.value)}</strong></div>) : <p className="muted">Nenhuma conta em aberto.</p>}</div></SectionCard>
      <SectionCard title="Clientes que mais gastam" description="Pagamentos confirmados no período"><div className="dashboard-ranking-chart dashboard-ranking-chart-financial">{bestClients.length ? bestClients.map((item) => <div key={item.name}><span>{item.name}</span><i><b style={{ width: `${(item.value / maxFinancialRanking) * 100}%` }} /></i><strong>{money(item.value)}</strong></div>) : <p className="muted">Nenhum pagamento confirmado no período.</p>}</div></SectionCard>
    </div>
  </div>;
}
