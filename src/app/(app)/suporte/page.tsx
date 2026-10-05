import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./page.utilities";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { createSupportTicketAction } from "@/lib/actions/support";
import { requireArenaAccess } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const statusLabels: Record<string, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  WAITING_CUSTOMER: "Aguardando retorno",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado"
};

const priorityLabels: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente"
};

const categoryLabels: Record<string, string> = {
  BUG: "Erro",
  ADJUSTMENT: "Ajuste",
  QUESTION: "Dúvida",
  FINANCE: "Financeiro",
  OTHER: "Outro"
};

export default async function SupportPage() {
  const auth = await requireArenaAccess();
  const tickets = await prisma.supportTicket.findMany({
    where: {
      arenaId: auth.arenaId
    },
    include: {
      requester: true,
      assignee: true,
      messages: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      }
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
  });

  return (
    <div className={viewStyles.stack_md}>
      <header className={viewStyles.page_header}>
        <div className={viewStyles.stack_xs}>
          <p className={viewStyles.eyebrow}>Suporte</p>
          <h1>Suporte e ajuda</h1>
          <p className={viewStyles.muted}>Abra chamados para reportar erros, pedir ajustes ou falar com a equipe de suporte.</p>
        </div>
      </header>

      <SectionCard title="Abrir ticket" description="Descreva o que aconteceu e informe a prioridade para a equipe de CS priorizar corretamente.">
        <SafeActionForm action={createSupportTicketAction} className={viewStyles.grid_form} resetOnSuccess successMessage="Ticket enviado ao suporte.">
          <div className={viewStyles.field}>
            <label htmlFor="ticket-title">Título</label>
            <input id="ticket-title" name="title" type="text" placeholder="Ex.: erro ao salvar jogo" required />
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="ticket-category">Categoria</label>
            <select id="ticket-category" name="category" defaultValue="BUG">
              <option value="BUG">Erro</option>
              <option value="ADJUSTMENT">Ajuste</option>
              <option value="QUESTION">Dúvida</option>
              <option value="FINANCE">Financeiro</option>
              <option value="OTHER">Outro</option>
            </select>
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="ticket-priority">Prioridade</label>
            <select id="ticket-priority" name="priority" defaultValue="MEDIUM">
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
          </div>
          <div className={viewStyles.field_form_full}>
            <label htmlFor="ticket-description">Descrição</label>
            <textarea id="ticket-description" name="description" rows={5} placeholder="Explique o que você tentou fazer, o que aconteceu e o que esperava que acontecesse." required />
          </div>
          <div className={viewStyles.field_field_submit}>
            <SubmitButton label="Enviar ticket" pendingLabel="Enviando..." className={viewStyles.button_button_primary} />
          </div>
        </SafeActionForm>
      </SectionCard>

      <SectionCard title="Meus tickets" description="Acompanhe o status dos chamados abertos por esta arena.">
        <div className={viewStyles.support_ticket_list}>
          {tickets.map((ticket) => (
            <article key={ticket.id} className={viewStyles.support_ticket_card}>
              <div>
                <span className={cx(`${viewStyles.ticket_status} ticket-status-${ticket.status.toLowerCase()}`)}>{statusLabels[ticket.status] ?? ticket.status}</span>
                <h3>{ticket.title}</h3>
                <p className={viewStyles.muted}>{ticket.code} · {categoryLabels[ticket.category] ?? ticket.category} · Prioridade {priorityLabels[ticket.priority] ?? ticket.priority}</p>
                <p className={viewStyles.table_subtext}>
                  {ticket.messages[0]?.body ?? ticket.description}
                </p>
              </div>
              <div className={viewStyles.support_ticket_meta}>
                <span>Solicitante: {ticket.requester.name}</span>
                <span>Responsável: {ticket.assignee?.name ?? "Aguardando CS"}</span>
                <span>Atualizado em {ticket.updatedAt.toLocaleDateString("pt-BR")}</span>
              </div>
            </article>
          ))}
          {!tickets.length ? <p className={viewStyles.muted}>Nenhum ticket aberto ainda.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
