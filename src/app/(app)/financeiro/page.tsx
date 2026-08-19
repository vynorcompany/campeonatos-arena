import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { getReceivedRevenueCents } from "@/lib/finance/dashboard";
import { prisma } from "@/lib/prisma";

function getMonthRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1)
  };
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default async function FinancePage() {
  const auth = await requireModuleView("finance");
  const { start, end } = getMonthRange();
  const [subscriptions, products, financialEntries, payrollEntries, recentEntries] = await Promise.all([
    prisma.studentSubscription.findMany({ where: { arenaId: auth.arenaId, status: "ACTIVE" } }),
    prisma.product.findMany({ where: { arenaId: auth.arenaId } }),
    prisma.financialEntry.findMany({
      where: {
        arenaId: auth.arenaId,
        OR: [{ paidAt: { gte: start, lt: end } }, { settlements: { some: { paidAt: { gte: start, lt: end } } } }]
      },
      include: { settlements: { select: { amountCents: true, paidAt: true } } }
    }),
    prisma.teacherPayrollEntry.findMany({ where: { arenaId: auth.arenaId } }),
    prisma.financialEntry.findMany({
      where: { arenaId: auth.arenaId },
      orderBy: [{ paidAt: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      take: 8
    })
  ]);
  const projectedPlanRevenue = subscriptions.reduce((total, subscription) => total + subscription.monthlyPriceCents, 0);
  const paidRevenue = getReceivedRevenueCents(financialEntries, start, end);
  const expenses = financialEntries
    .filter((entry) => entry.type === "EXPENSE")
    .reduce((total, entry) => total + entry.amountCents, 0);
  const payrollTotal = payrollEntries.reduce(
    (total, entry) => total + entry.fixedSalaryCents + entry.bonusCents - entry.discountCents,
    0
  );
  const stockValue = products.reduce((total, product) => total + product.stockQuantity * product.priceCents, 0);

  const shortcuts = [
    ["Planos", "/financeiro/planos", "Cadastre pacotes e mensalidades."],
    ["Mensalidades", "/financeiro/mensalidades", "Vincule alunos a planos e registre pagamentos."],
    ["Folha", "/financeiro/folha", "Calcule salários e despesas de professores."],
    ["Lançamentos", "/financeiro/lancamentos", "Registre receitas e despesas manuais."],
    ["PDV/estoque", "/financeiro/pdv-estoque", "Veja vendas, estoque e movimentações."]
  ] as const;

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Financeiro</p>
          <h1>Dashboard financeiro</h1>
          <p className="muted">Resumo da operação, com atalhos para cada área financeira em páginas separadas.</p>
        </div>
      </header>

      <div className="stats-grid finance-stats-grid">
        <div className="stat-card">
          <strong>{formatMoney(paidRevenue)}</strong>
          <span>receita recebida no mês</span>
        </div>
        <div className="stat-card">
          <strong>{formatMoney(projectedPlanRevenue)}</strong>
          <span>mensalidades previstas</span>
        </div>
        <div className="stat-card">
          <strong>{formatMoney(expenses + payrollTotal)}</strong>
          <span>custos e salários</span>
        </div>
        <div className="stat-card">
          <strong>{formatMoney(stockValue)}</strong>
          <span>valor em estoque</span>
        </div>
      </div>

      <SectionCard title="Áreas financeiras" description="Cada rotina financeira agora tem sua própria página.">
        <div className="finance-shortcut-grid">
          {shortcuts.map(([label, href, description]) => (
            <Link href={href} className="finance-shortcut" key={href}>
              <strong>{label}</strong>
              <span>{description}</span>
            </Link>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Últimos lançamentos" description="Movimentações financeiras mais recentes.">
        <div className="simple-list">
          {recentEntries.map((entry) => (
            <div className="simple-item" key={entry.id}>
              <strong>{entry.description}</strong>
              <span>
                {entry.type === "REVENUE" ? "Receita" : "Despesa"} - {entry.category} - {formatMoney(entry.amountCents)}
              </span>
            </div>
          ))}
          {!recentEntries.length ? <p className="muted">Nenhum lançamento financeiro cadastrado.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
