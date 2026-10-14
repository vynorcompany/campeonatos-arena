import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./page.utilities";
import { SectionCard } from "@/components/section-card";
import { requireAgencyPageAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function AgencySupportHistoryPage() {
  await requireAgencyPageAccess();
  const tickets = await prisma.supportTicket.findMany({
    where: { status: { in: ["RESOLVED", "CLOSED"] } },
    include: { arena: true, requester: true, assignee: true },
    orderBy: { updatedAt: "desc" },
    take: 80
  });

  return (
    <div className={viewStyles.stack_md}>
      <header className={viewStyles.page_header}>
        <div className={viewStyles.stack_xs}>
          <p className={viewStyles.eyebrow}>Agência</p>
          <h1>Histórico de suporte</h1>
          <p className={viewStyles.muted}>Tickets resolvidos ou fechados pela equipe de suporte.</p>
        </div>
      </header>

      <SectionCard title="Histórico" description="Base de chamados finalizados para auditoria e acompanhamento de CS.">
        {tickets.length ? <table className={viewStyles.data_table}>
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
                <td><span className={viewStyles.mobile_label}>Ticket</span><strong>{ticket.title}</strong><span className={viewStyles.table_subtext}>{ticket.code}</span></td>
                <td><span className={viewStyles.mobile_label}>Arena</span>{ticket.arena.name}</td>
                <td><span className={viewStyles.mobile_label}>Status</span><span className={cx(`${viewStyles.ticket_status} ticket-status-${ticket.status.toLowerCase()}`)}>{ticket.status === "RESOLVED" ? "Resolvido" : "Fechado"}</span></td>
                <td><span className={viewStyles.mobile_label}>Responsável</span>{ticket.assignee?.name ?? "Sem responsável"}</td>
                <td><span className={viewStyles.mobile_label}>Atualizado em</span>{new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(ticket.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table> : null}
        {!tickets.length ? <p className={viewStyles.muted}>Nenhum ticket finalizado ainda.</p> : null}
      </SectionCard>
    </div>
  );
}
