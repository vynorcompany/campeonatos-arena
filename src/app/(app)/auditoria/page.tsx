import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { WorkspaceHeading } from "@/components/ui/workspace-heading";

const labels: Record<string, string> = { COURT_CHECKIN: "Check-in confirmado", COMANDA_DELETED: "Comanda excluída", COMANDA_SPLIT: "Comanda dividida", AGENT_KEY_CREATED: "Chave de agente criada", AGENT_KEY_REVOKED: "Chave de agente revogada", FINANCIAL_ENTRY_CREATED: "Lançamento financeiro criado", PAGE_VIEW: "Acesso à página" };
const verbs: Record<string, string> = { create: "Criar", update: "Atualizar", save: "Salvar", delete: "Excluir", remove: "Remover", add: "Adicionar", insert: "Inserir", open: "Abrir", close: "Fechar", finish: "Finalizar", cancel: "Cancelar", confirm: "Confirmar", login: "Entrar", logout: "Sair", register: "Cadastrar", send: "Enviar", request: "Solicitar", toggle: "Alterar", connect: "Conectar", revoke: "Revogar", reconcile: "Conciliar", upsert: "Salvar" };
const targets: Record<string, string> = { Supplier: "fornecedor", FinancialSetting: "cadastro financeiro", CashRegister: "caixa", CashMovement: "movimentação de caixa", StandardServicePrice: "preço de serviço", OnlineBookingSettings: "agendamento online", CourtBooking: "reserva de quadra", BookingComandas: "comandas da reserva", PublicClient: "cliente do portal", PublicPlayerProfile: "perfil do atleta", PublicCourtBooking: "reserva online", PublicCourtBookingRequest: "solicitação de reserva online", SponsorInPlan: "empresa no plano", TvSponsor: "empresa patrocinadora", TvPresentationSettings: "configuração da TV", Comanda: "comanda", ComandaItem: "item da comanda", Player: "cliente", Tournament: "torneio", Category: "categoria", Product: "produto", ProductCategory: "categoria de produto", FinancialCategory: "categoria financeira", Coupon: "cupom", User: "usuário", PermissionProfile: "perfil de permissões", Teacher: "professor", Lesson: "aula", Notification: "notificação", AgentApiKey: "chave de agente" };
function actionLabel(action: string) {
  if (labels[action]) return labels[action];
  if (action.startsWith("DB:")) {
    const [, operation, model] = action.split(":");
    const verb = ({ CREATE: "Inclusão", UPDATE: "Alteração", DELETE: "Exclusão" } as Record<string, string>)[operation] ?? operation;
    return `${verb} · ${targets[model] ?? model}`;
  }
  if (action.startsWith("API:")) return `Requisição à API · ${action.slice(4)}`;
  if (action.startsWith("REQUEST:")) return `Requisição · ${action.slice(8)}`;
  if (action.startsWith("ACTION:")) {
    const words = action.slice(7).replace(/Action$/, "").replace(/([a-z])([A-Z])/g, "$1 $2").split(" ");
    return `Solicitação · ${verbs[words[0].toLowerCase()] ?? words[0]} ${targets[words.slice(1).join("")] ?? words.slice(1).join(" ")}`.trim();
  }
  return action;
}

type Filters = { q?: string; kind?: string; page?: string; scope?: string; from?: string; until?: string };
export default async function AuditPage({ searchParams }: { searchParams?: Promise<Filters> }) {
  const auth = await requireRole("ADMIN");
  const filters = await searchParams ?? {};
  const global = filters.scope === "system" && ["SUPER_ADMIN", "ADMIN"].includes(auth.systemRole);
  const page = Math.max(1, Math.min(100000, Number.parseInt(filters.page ?? "1", 10) || 1));
  const q = (filters.q ?? "").trim().slice(0, 120);
  const where: Prisma.AuditEventWhereInput = { arenaId: global ? null : auth.arenaId };
  if (q) where.OR = [{ actorName: { contains: q, mode: "insensitive" } }, { action: { contains: q, mode: "insensitive" } }, { details: { path: ["path"], string_contains: q } }, { entityId: { contains: q } }];
  if (filters.kind === "changes") where.action = { startsWith: "DB:" };
  if (filters.kind === "access") where.action = "PAGE_VIEW";
  if (filters.kind === "api") where.action = { startsWith: "API:" };
  if (filters.kind === "actions") where.NOT = [{ action: "PAGE_VIEW" }, { action: { startsWith: "API:" } }];
  const since = /^\d{4}-\d{2}-\d{2}$/.test(filters.from ?? "") ? new Date(`${filters.from}T00:00:00-03:00`) : null;
  const until = /^\d{4}-\d{2}-\d{2}$/.test(filters.until ?? "") ? new Date(new Date(`${filters.until}T00:00:00-03:00`).getTime() + 86400000) : null;
  if (since || until) where.createdAt = { ...(since && !Number.isNaN(since.getTime()) ? { gte: since } : {}), ...(until && !Number.isNaN(until.getTime()) ? { lt: until } : {}) };
  const [events, total] = await withArenaTransaction(auth.arenaId, async tx => {
    if (global) await tx.$executeRaw`SELECT set_config('app.audit_agency', 'true', true)`;
    return Promise.all([tx.auditEvent.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 50, take: 50 }), tx.auditEvent.count({ where })]);
  });
  const href = (next: number) => { const params = new URLSearchParams(); for (const [key, value] of Object.entries(filters)) if (value && key !== "page") params.set(key, value); params.set("page", String(next)); return `/auditoria?${params}`; };
  return <section className={ui.page}>
    <WorkspaceHeading title="Auditoria" description="Horários de Brasília." />
    <form method="get" className={ui.filters}>
      <label className={`${ui.field} tw:w-[240px]`}>Pesquisar<input name="q" defaultValue={q} placeholder="Pessoa, ação ou página" /></label>
      <label className={ui.field}>Registros<select name="kind" defaultValue={filters.kind ?? ""}><option value="">Todos</option><option value="actions">Ações</option><option value="changes">Alterações gravadas</option><option value="access">Acessos</option><option value="api">API</option></select></label>
      <label className={ui.field}>De<input name="from" type="date" defaultValue={filters.from} /></label><label className={ui.field}>Até<input name="until" type="date" defaultValue={filters.until} /></label>
      {["SUPER_ADMIN", "ADMIN"].includes(auth.systemRole) ? <label className={ui.field}>Escopo<select name="scope" defaultValue={global ? "system" : "arena"}><option value="arena">Arena atual</option><option value="system">Agência e sistema</option></select></label> : null}
      <button className={ui.secondary}>Filtrar</button>
    </form>
    <p className="tw:m-0 tw:text-xs tw:text-[var(--muted)]">{total} registro{total === 1 ? "" : "s"}</p>
    <div className={ui.list}>{!events.length ? <p className={ui.empty}>Nenhum registro encontrado.</p> : events.map(event => {
      const details = event.details && typeof event.details === "object" && !Array.isArray(event.details) ? event.details : {};
      return <article key={event.id} className={`${ui.row} tw:grid-cols-[170px_minmax(0,1fr)_160px] tw:viewport-760:grid-cols-1`}>
        <time dateTime={event.createdAt.toISOString()} className="tw:text-xs tw:text-[var(--muted)]">{new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "medium" }).format(event.createdAt)}</time>
        <div><strong>{actionLabel(event.action)}</strong><small className="tw:break-words">{String(details.path ?? details.code ?? details.name ?? details.description ?? event.entityId)}</small>{typeof details.statusCode === "number" ? <small>HTTP {details.statusCode}{details.stage === "INTERRUPTED" ? " · conexão interrompida" : ""}</small> : details.stage === "REQUESTED" ? <small>Solicitação registrada</small> : null}{global && typeof details.affectedArenaCount === "number" && details.affectedArenaCount > 1 ? <small>{details.affectedArenaCount} arenas envolvidas</small> : null}{typeof details.totalCents === "number" ? <small>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(details.totalCents / 100)}</small> : null}</div>
        <span className="tw:break-words tw:text-xs">{event.actorName}</span>
      </article>;
    })}</div>
    <nav aria-label="Páginas da auditoria" className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">{page > 1 ? <Link href={href(page - 1)} className={ui.secondary}>Anterior</Link> : null}<span className="tw:text-xs">Página {page} de {Math.max(1, Math.ceil(total / 50))}</span>{page * 50 < total ? <Link href={href(page + 1)} className={ui.secondary}>Próxima</Link> : null}</nav>
  </section>;
}
