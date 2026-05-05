import { SectionCard } from "@/components/section-card";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatCurrency, getAgencyMetrics } from "@/lib/services/agency";

export default async function AgencyDashboardPage() {
  await requireAgencyAccess();
  const [metrics, tickets] = await Promise.all([
    getAgencyMetrics(),
    prisma.supportTicket.findMany({
      include: {
        arena: true,
        requester: true,
        assignee: true
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 8
    })
  ]);
  const activeArenas = metrics.arenas.filter((arena) => arena.accountStatus === "ACTIVE").length;

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Agência</p>
          <h1>Dashboard da agência</h1>
          <p className="muted">Visão executiva de arenas, receita recorrente, usuários e chamados.</p>
        </div>
      </header>

      <div className="agency-stats-grid">
        <div className="stat-card"><strong>{metrics.arenas.length}</strong><span>arenas cadastradas</span></div>
        <div className="stat-card"><strong>{activeArenas}</strong><span>arenas ativas</span></div>
        <div className="stat-card"><strong>{formatCurrency(metrics.mrrCents)}</strong><span>MRR operacional</span></div>
        <div className="stat-card"><strong>{metrics.openTickets}</strong><span>tickets em aberto</span></div>
      </div>

      <div className="agency-grid">
        <SectionCard title="Arenas recentes" description="Últimas operações cadastradas no sistema.">
          <div className="agency-arena-list">
            {metrics.arenas.slice(0, 8).map((arena) => (
              <article key={arena.id} className="agency-mini-row">
                <div>
                  <strong>{arena.name}</strong>
                  <span className="table-subtext">{arena.city || arena.email || arena.slug}</span>
                </div>
                <span>{arena.accountStatus}</span>
                <span>{arena._count.members} usuários</span>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Tickets recentes" description="Fila curta para acompanhamento rápido do CS.">
          <div className="agency-arena-list">
            {tickets.map((ticket) => (
              <article key={ticket.id} className="agency-mini-row">
                <div>
                  <strong>{ticket.title}</strong>
                  <span className="table-subtext">{ticket.code} · {ticket.arena.name}</span>
                </div>
                <span>{ticket.status}</span>
              </article>
            ))}
            {!tickets.length ? <p className="muted">Nenhum ticket recebido ainda.</p> : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
