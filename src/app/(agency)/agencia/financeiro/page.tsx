import { SectionCard } from "@/components/section-card";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { formatCurrency, getAgencyMetrics } from "@/lib/services/agency";

export default async function AgencyFinancePage() {
  await requireAgencyAccess();
  const metrics = await getAgencyMetrics();
  const revenueCents = metrics.paidEntries.filter((entry) => entry.type === "REVENUE").reduce((total, entry) => total + entry.amountCents, 0);
  const expenseCents = metrics.paidEntries.filter((entry) => entry.type === "EXPENSE").reduce((total, entry) => total + entry.amountCents, 0);

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Agência</p>
          <h1>Financeiro da agência</h1>
          <p className="muted">MRR, receitas operacionais, custos registrados e previsões por base ativa.</p>
        </div>
      </header>

      <div className="agency-stats-grid">
        <div className="stat-card"><strong>{formatCurrency(metrics.mrrCents)}</strong><span>MRR atual</span></div>
        <div className="stat-card"><strong>{formatCurrency(metrics.mrrCents * 12)}</strong><span>ARR projetado</span></div>
        <div className="stat-card"><strong>{formatCurrency(revenueCents)}</strong><span>receitas pagas</span></div>
        <div className="stat-card"><strong>{formatCurrency(expenseCents)}</strong><span>despesas pagas</span></div>
      </div>

      <SectionCard title="Resumo por arena" description="Base operacional usada para MRR e previsões.">
        <div className="agency-arena-list">
          {metrics.arenas.map((arena) => {
            const arenaMrr = metrics.activeSubscriptions.filter((subscription) => subscription.arenaId === arena.id).reduce((total, subscription) => total + subscription.monthlyPriceCents, 0);
            return (
              <article key={arena.id} className="agency-mini-row">
                <div>
                  <strong>{arena.name}</strong>
                  <span className="table-subtext">{arena.accountStatus}</span>
                </div>
                <span>{formatCurrency(arenaMrr)} MRR</span>
                <span>{arena._count.students} alunos</span>
              </article>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
