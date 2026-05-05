import { SectionCard } from "@/components/section-card";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function AgencySupportHistoryPage() {
  await requireAgencyAccess();
  const tickets = await prisma.supportTicket.findMany({
    where: { status: { in: ["RESOLVED", "CLOSED"] } },
    include: { arena: true, requester: true, assignee: true },
    orderBy: { updatedAt: "desc" },
    take: 80
  });

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Agência</p>
          <h1>Histórico de suporte</h1>
          <p className="muted">Tickets resolvidos ou fechados pela equipe de suporte.</p>
        </div>
      </header>

      <SectionCard title="Histórico" description="Base de chamados finalizados para auditoria e acompanhamento de CS.">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Arena</th>
              <th>Status</th>
              <th>Responsável</th>
              <th>Atualizado em</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td><strong>{ticket.title}</strong><span className="table-subtext">{ticket.code}</span></td>
                <td>{ticket.arena.name}</td>
                <td>{ticket.status}</td>
                <td>{ticket.assignee?.name ?? "Sem responsável"}</td>
                <td>{ticket.updatedAt.toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!tickets.length ? <p className="muted">Nenhum ticket finalizado ainda.</p> : null}
      </SectionCard>
    </div>
  );
}
