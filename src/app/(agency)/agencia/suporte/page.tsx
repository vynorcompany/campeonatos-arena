import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./page.utilities";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { addSupportTicketMessageAction, updateAgencyTicketAction } from "@/lib/actions/support";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const statusLabels: Record<string, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  WAITING_CUSTOMER: "Aguardando cliente",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado"
};

const priorityLabels: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente"
};

export default async function AgencySupportPage() {
  const auth = await requireAgencyAccess();
  const [tickets, agencyUsers] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { status: { notIn: ["RESOLVED", "CLOSED"] } },
      include: {
        arena: true,
        requester: true,
        assignee: true,
        messages: { include: { author: true }, orderBy: { createdAt: "desc" }, take: 3 }
      },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }]
    }),
    prisma.user.findMany({
      where: { systemRole: { in: ["SUPER_ADMIN", "ADMIN", "MANAGER"] } },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <div className={viewStyles.stack_md}>
      <header className={viewStyles.page_header}>
        <div className={viewStyles.stack_xs}>
          <p className={viewStyles.eyebrow}>Agência</p>
          <h1>Área de suporte</h1>
          <p className={viewStyles.muted}>Fila de tickets abertos pelas arenas para atendimento, ajuste e histórico de CS.</p>
        </div>
      </header>

      <SectionCard title="Tickets em aberto" description="Assuma, priorize, responda ou resolva os chamados.">
        <div className={viewStyles.agency_ticket_list}>
          {tickets.map((ticket) => (
            <article key={ticket.id} className={viewStyles.agency_ticket_card}>
              <div className={viewStyles.agency_ticket_head}>
                <div>
                  <span className={cx(`${viewStyles.ticket_status} ticket-status-${ticket.status.toLowerCase()}`)}>{statusLabels[ticket.status] ?? ticket.status}</span>
                  <h3>{ticket.title}</h3>
                  <p className={viewStyles.muted}>{ticket.code} · {ticket.arena.name} · {ticket.requester.name}</p>
                </div>
                <span className={cx(`${viewStyles.ticket_priority} ticket-priority-${ticket.priority.toLowerCase()}`)}>{priorityLabels[ticket.priority] ?? ticket.priority}</span>
              </div>
              <p className={viewStyles.table_subtext}>{ticket.description}</p>

              <SafeActionForm action={updateAgencyTicketAction} className={viewStyles.agency_ticket_controls} successMessage="Ticket atualizado.">
                <input type="hidden" name="ticketId" value={ticket.id} />
                <select name="status" defaultValue={ticket.status}>
                  <option value="OPEN">Aberto</option>
                  <option value="IN_PROGRESS">Em andamento</option>
                  <option value="WAITING_CUSTOMER">Aguardando cliente</option>
                  <option value="RESOLVED">Resolvido</option>
                  <option value="CLOSED">Fechado</option>
                </select>
                <select name="priority" defaultValue={ticket.priority}>
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
                <select name="assigneeId" defaultValue={ticket.assigneeId ?? ""}>
                  <option value="">Assumir automaticamente</option>
                  {agencyUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
                <SubmitButton label="Atualizar" pendingLabel="..." className={viewStyles.button} />
              </SafeActionForm>

              <SafeActionForm action={addSupportTicketMessageAction} className={viewStyles.agency_ticket_message_form} resetOnSuccess successMessage="Mensagem adicionada.">
                <input type="hidden" name="ticketId" value={ticket.id} />
                <textarea name="body" rows={2} placeholder="Adicionar resposta ou nota interna..." />
                <label className={viewStyles.check_option}><input type="checkbox" name="internal" /><span>Nota interna</span></label>
                <SubmitButton label={ticket.assigneeId === auth.userId ? "Responder" : "Assumir e responder"} pendingLabel="..." className={viewStyles.button_button_secondary} />
              </SafeActionForm>

              {ticket.messages.length ? (
                <div className={viewStyles.agency_ticket_messages}>
                  {ticket.messages.map((message) => (
                    <p key={message.id}><strong>{message.author.name}</strong>{message.internal ? " · nota interna" : ""}: {message.body}</p>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
          {!tickets.length ? <p className={viewStyles.muted}>Nenhum ticket em aberto.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
