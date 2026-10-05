import { viewStyles } from "./page.utilities";
import { SectionCard } from "@/components/section-card";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { formatCurrency, getAgencyMetrics } from "@/lib/services/agency";

export default async function AgencyFinancePage() {
  await requireAgencyAccess();
  const metrics = await getAgencyMetrics();

  return (
    <div className={viewStyles.stack_md}>
      <header className={viewStyles.page_header}>
        <div className={viewStyles.stack_xs}>
          <p className={viewStyles.eyebrow}>Agência</p>
          <h1>Financeiro da agência</h1>
          <p className={viewStyles.muted}>Receita das assinaturas da plataforma, independente das finanças de cada arena.</p>
        </div>
      </header>

      <div className={viewStyles.agency_stats_grid}>
        <div className={viewStyles.stat_card}><strong>{formatCurrency(metrics.mrrCents)}</strong><span>MRR atual</span></div>
        <div className={viewStyles.stat_card}><strong>{formatCurrency(metrics.mrrCents * 12)}</strong><span>ARR projetado</span></div>
        <div className={viewStyles.stat_card}><strong>{formatCurrency(metrics.paidInvoiceCents)}</strong><span>faturas pagas</span></div>
        <div className={viewStyles.stat_card}><strong>{formatCurrency(metrics.openInvoiceCents)}</strong><span>faturas em aberto</span></div>
      </div>

      <SectionCard title="Resumo por arena" description="Apenas assinaturas da plataforma entram neste MRR.">
        <div className={viewStyles.agency_arena_list}>
          {metrics.arenas.map((arena) => {
            const arenaMrr = metrics.activeSubscriptions.filter((subscription) => subscription.arenaId === arena.id).reduce((total, subscription) => total + subscription.plan.monthlyPriceCents, 0);
            return (
              <article key={arena.id} className={viewStyles.agency_mini_row}>
                <div>
                  <strong>{arena.name}</strong>
                  <span className={viewStyles.table_subtext}>{arena.accountStatus}</span>
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
