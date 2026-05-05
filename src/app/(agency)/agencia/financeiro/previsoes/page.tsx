import { SectionCard } from "@/components/section-card";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { formatCurrency, getAgencyMetrics } from "@/lib/services/agency";

export default async function AgencyForecastPage() {
  await requireAgencyAccess();
  const metrics = await getAgencyMetrics();
  const activeArenas = metrics.arenas.filter((arena) => arena.accountStatus === "ACTIVE").length;
  const conservative = Math.round(metrics.mrrCents * 1.05);
  const target = Math.round(metrics.mrrCents * 1.15);

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Agência</p>
          <h1>Previsões financeiras</h1>
          <p className="muted">Cenários simples para acompanhamento do crescimento da base.</p>
        </div>
      </header>

      <div className="agency-stats-grid">
        <div className="stat-card"><strong>{formatCurrency(metrics.mrrCents)}</strong><span>MRR atual</span></div>
        <div className="stat-card"><strong>{formatCurrency(conservative)}</strong><span>cenário conservador</span></div>
        <div className="stat-card"><strong>{formatCurrency(target)}</strong><span>meta do mês</span></div>
        <div className="stat-card"><strong>{activeArenas}</strong><span>arenas ativas</span></div>
      </div>

      <SectionCard title="Leitura rápida" description="Projeção inicial baseada na receita recorrente atual das mensalidades ativas.">
        <p className="muted">Próximo passo natural: incluir planos comerciais da agência, contratos por arena, churn e inadimplência para uma previsão mais fiel.</p>
      </SectionCard>
    </div>
  );
}
