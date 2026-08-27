import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
const dayKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const dayLabel = (value: Date) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(value);

function ranking(items: Array<{ name: string; value: number }>) {
  return Object.values(items.reduce<Record<string, { name: string; value: number }>>((all, item) => {
    all[item.name] = { name: item.name, value: (all[item.name]?.value ?? 0) + item.value };
    return all;
  }, {})).sort((a, b) => b.value - a.value).slice(0, 5);
}

export default async function OverviewPage() {
  const auth = await requireModuleView("dashboard");
  const from = new Date();
  from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);
  const [entries, reservations, saleItems, teachers] = await Promise.all([
    prisma.financialEntry.findMany({ where: { arenaId: auth.arenaId, createdAt: { gte: from } }, select: { type: true, status: true, amountCents: true, paidAt: true } }),
    prisma.scheduleOccurrence.findMany({ where: { arenaId: auth.arenaId, startsAt: { gte: from }, status: { not: "CANCELLED" } }, include: { occurrenceCourts: { include: { court: { select: { name: true } } } } } }),
    prisma.saleItem.findMany({ where: { sale: { arenaId: auth.arenaId, createdAt: { gte: from } } }, select: { quantity: true, totalCents: true, product: { select: { name: true } } } }),
    prisma.teacher.findMany({ where: { arenaId: auth.arenaId, active: true }, include: { lessons: { where: { scheduledAt: { gte: from } }, include: { attendances: true } } } })
  ]);
  const received = entries.filter((entry) => entry.type === "REVENUE" && entry.status === "PAID").reduce((total, entry) => total + entry.amountCents, 0);
  const paid = entries.filter((entry) => entry.type === "EXPENSE" && entry.status === "PAID").reduce((total, entry) => total + entry.amountCents, 0);
  const pending = entries.filter((entry) => entry.type === "REVENUE" && entry.status === "PENDING").reduce((total, entry) => total + entry.amountCents, 0);
  const days = Array.from({ length: 30 }, (_, index) => { const date = new Date(from); date.setDate(from.getDate() + index); return date; });
  const cashDays = days.map((date) => {
    const key = dayKey(date);
    const income = entries.filter((entry) => entry.type === "REVENUE" && entry.status === "PAID" && entry.paidAt && dayKey(entry.paidAt) === key).reduce((total, entry) => total + entry.amountCents, 0);
    const expense = entries.filter((entry) => entry.type === "EXPENSE" && entry.status === "PAID" && entry.paidAt && dayKey(entry.paidAt) === key).reduce((total, entry) => total + entry.amountCents, 0);
    return { label: dayLabel(date), income, expense, total: income - expense };
  });
  const cashMax = Math.max(1, ...cashDays.flatMap((day) => [day.income, day.expense]));
  const courts = ranking(reservations.flatMap((reservation) => reservation.occurrenceCourts.map((court) => ({ name: court.court.name, value: 1 }))));
  const products = ranking(saleItems.map((item) => ({ name: item.product.name, value: item.quantity })));
  const students = ranking(teachers.map((teacher) => ({ name: teacher.name, value: new Set(teacher.lessons.flatMap((lesson) => lesson.attendances.map((attendance) => attendance.studentId))).size })));
  const maxRanking = Math.max(1, ...courts.map((item) => item.value), ...products.map((item) => item.value), ...students.map((item) => item.value));

  return <div className="stack-md workspace-page dashboard-analytics-page">
    <header className="page-header"><div><p className="eyebrow">VISÃO GERAL</p><h1>Saúde da arena</h1><p className="muted">Últimos 30 dias.</p></div></header>
    <SectionCard title="Resumo financeiro" className="dashboard-financial-summary"><div className="stats-grid"><StatCard label="Entradas" value={money(received)} caption="Receitas quitadas" /><StatCard label="Saídas" value={money(paid)} caption="Despesas quitadas" /><StatCard label="Resultado" value={money(received - paid)} caption={`A receber: ${money(pending)}`} /><StatCard label="Reservas" value={reservations.length} caption="No período" /></div></SectionCard>
    <SectionCard title="Fluxo de caixa diário" className="dashboard-cash-flow"><div className="dashboard-chart-legend"><span><i className="dashboard-chart-income" />Entradas</span><span><i className="dashboard-chart-expense" />Saídas</span></div><div className="dashboard-cash-chart" role="img" aria-label="Gráfico diário de entradas e saídas"><div className="dashboard-cash-bars">{cashDays.map((day) => <div className="dashboard-cash-day" key={day.label} title={`${day.label}: entradas ${money(day.income)}, saídas ${money(day.expense)}`}><div className="dashboard-cash-column"><span className="dashboard-cash-income" style={{ height: `${Math.max(day.income ? 7 : 0, (day.income / cashMax) * 100)}%` }} /><span className="dashboard-cash-expense" style={{ height: `${Math.max(day.expense ? 7 : 0, (day.expense / cashMax) * 100)}%` }} /></div><small>{day.label}</small></div>)}</div></div></SectionCard>
    <div className="dashboard-grid dashboard-chart-grid">
      <SectionCard title="Quadras com mais reservas"><div className="dashboard-ranking-chart">{courts.map((item) => <div key={item.name}><span>{item.name}</span><i><b style={{ width: `${(item.value / maxRanking) * 100}%` }} /></i><strong>{item.value}</strong></div>)}</div></SectionCard>
      <SectionCard title="Produtos mais vendidos"><div className="dashboard-ranking-chart">{products.map((item) => <div key={item.name}><span>{item.name}</span><i><b style={{ width: `${(item.value / maxRanking) * 100}%` }} /></i><strong>{item.value}</strong></div>)}</div></SectionCard>
      <SectionCard title="Alunos por professor"><div className="dashboard-ranking-chart">{students.map((item) => <div key={item.name}><span>{item.name}</span><i><b style={{ width: `${(item.value / maxRanking) * 100}%` }} /></i><strong>{item.value}</strong></div>)}</div></SectionCard>
    </div>
  </div>;
}
