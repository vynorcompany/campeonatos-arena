import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

export default async function OverviewPage() {
  const auth = await requireModuleView("dashboard"); const from = new Date(); from.setDate(from.getDate() - 30);
  const [entries, reservations, sales, teachers] = await Promise.all([
    prisma.financialEntry.findMany({ where: { arenaId: auth.arenaId, createdAt: { gte: from } }, select: { type: true, status: true, amountCents: true } }),
    prisma.scheduleOccurrence.findMany({ where: { arenaId: auth.arenaId, startsAt: { gte: from }, status: { not: "CANCELLED" } }, include: { occurrenceCourts: { include: { court: { select: { name: true } } } } } }),
    prisma.saleItem.findMany({ where: { sale: { arenaId: auth.arenaId, createdAt: { gte: from } } }, include: { product: { select: { name: true } } } }),
    prisma.teacher.findMany({ where: { arenaId: auth.arenaId, active: true }, include: { lessons: { where: { scheduledAt: { gte: from } }, include: { attendances: true } } } })
  ]);
  const received = entries.filter((e) => e.type === "REVENUE" && e.status === "PAID").reduce((a, e) => a + e.amountCents, 0); const paid = entries.filter((e) => e.type === "EXPENSE" && e.status === "PAID").reduce((a, e) => a + e.amountCents, 0); const pending = entries.filter((e) => e.type === "REVENUE" && e.status === "PENDING").reduce((a, e) => a + e.amountCents, 0);
  const top = (items: string[]) => Object.entries(items.reduce<Record<string, number>>((all, item) => { all[item] = (all[item] ?? 0) + 1; return all; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const courts = top(reservations.flatMap((r) => r.occurrenceCourts.map((c) => c.court.name))); const products = top(sales.flatMap((s) => Array(s.quantity).fill(s.product.name)));
  return <div className="stack-md workspace-page"><header className="page-header"><div><p className="eyebrow">VISÃO GERAL</p><h1>Saúde da arena</h1><p className="muted">Últimos 30 dias.</p></div></header><div className="stats-grid"><StatCard label="Entradas" value={money(received)} caption="Receitas quitadas" /><StatCard label="Saídas" value={money(paid)} caption="Despesas quitadas" /><StatCard label="Resultado financeiro" value={money(received - paid)} caption={`A receber: ${money(pending)}`} /><StatCard label="Reservas" value={reservations.length} caption="No período" /></div><div className="dashboard-grid"><SectionCard title="Fluxo de caixa"><div className="simple-list"><div className="simple-item"><strong>Entradas</strong><span>{money(received)}</span></div><div className="simple-item"><strong>Saídas</strong><span>{money(paid)}</span></div><div className="simple-item"><strong>Resultado</strong><span>{money(received - paid)}</span></div></div></SectionCard><SectionCard title="Quadras com mais reservas"><div className="simple-list">{courts.map(([name, count]) => <div className="simple-item" key={name}><strong>{name}</strong><span>{count} reserva(s)</span></div>)}</div></SectionCard><SectionCard title="Produtos mais vendidos"><div className="simple-list">{products.map(([name, count]) => <div className="simple-item" key={name}><strong>{name}</strong><span>{count} unidade(s)</span></div>)}</div></SectionCard><SectionCard title="Alunos por professor"><div className="simple-list">{teachers.map((teacher) => <div className="simple-item" key={teacher.id}><strong>{teacher.name}</strong><span>{new Set(teacher.lessons.flatMap((lesson) => lesson.attendances.map((attendance) => attendance.studentId))).size} aluno(s)</span></div>)}</div></SectionCard></div></div>;
}
