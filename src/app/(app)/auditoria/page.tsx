import { AgentActionBadge } from "@/components/ui/agent-action-badge";
import { AuditDetails } from "@/components/audit-details";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { getAuditWorkspace } from "@/lib/audit/workspace-data";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { WorkspaceHeading } from "@/components/ui/workspace-heading";

type Filters = { q?: string; kind?: string; page?: string; scope?: string; from?: string; until?: string };
export default async function AuditPage({ searchParams }: { searchParams?: Promise<Filters> }) {
  const auth = await requireRole("ADMIN");
  const filters = await searchParams ?? {};
  const global = filters.scope === "system" && ["SUPER_ADMIN", "ADMIN"].includes(auth.systemRole);
  const page = Math.max(1, Math.min(100000, Number.parseInt(filters.page ?? "1", 10) || 1));
  const q = (filters.q ?? "").trim().slice(0, 120);
  const { events, total } = await getAuditWorkspace(auth.arenaId,{q,page,scope:global?'system':'arena',...(/^\d{4}-\d{2}-\d{2}$/.test(filters.from??'')?{from:filters.from}:{}),...(/^\d{4}-\d{2}-\d{2}$/.test(filters.until??'')?{until:filters.until}:{})},global);
  const href = (next: number) => { const params = new URLSearchParams(); for (const [key, value] of Object.entries(filters)) if (value && key !== "page") params.set(key, value); params.set("page", String(next)); return `/auditoria?${params}`; };
  return <section className={ui.page}>
    <WorkspaceHeading title="Auditoria" description="Horários de Brasília." />
    <form method="get" className={ui.filters}>
      <label className={`${ui.field} tw:w-[240px]`}>Pesquisar<input name="q" defaultValue={q} placeholder="Pessoa ou ação" /></label>

      <label className={ui.field}>De<input name="from" type="date" defaultValue={filters.from} /></label><label className={ui.field}>Até<input name="until" type="date" defaultValue={filters.until} /></label>
      {["SUPER_ADMIN", "ADMIN"].includes(auth.systemRole) ? <label className={ui.field}>Escopo<select name="scope" defaultValue={global ? "system" : "arena"}><option value="arena">Arena atual</option><option value="system">Agência e sistema</option></select></label> : null}
      <button className={ui.secondary}>Filtrar</button>
    </form>
    <p className="tw:m-0 tw:text-xs tw:text-[#354f70]">{total} registro{total === 1 ? "" : "s"}</p>
    <div className={ui.list}>{!events.length ? <p className={ui.empty}>Nenhum registro encontrado.</p> : events.map(event => {
      return <article key={event.id} className="tw:min-w-0 tw:border-b tw:border-[var(--line)] tw:last:border-b-0">
      <div className={`${ui.row} tw:cursor-pointer tw:list-none tw:grid-cols-[170px_minmax(0,1fr)_160px] tw:viewport-760:grid-cols-1 tw:focus-visible:outline-2 tw:focus-visible:outline-[var(--primary)]`}>
        <time dateTime={event.createdAt.toISOString()} className="tw:text-xs tw:text-[#354f70]">{new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "medium" }).format(event.createdAt)}</time>
        <div><strong>{event.label}</strong><small className="tw:break-words">{event.recordName}</small>{event.statusText ? <small>{event.statusText}</small> : null}{event.affectedArenaCount !== null ? <small>{event.affectedArenaCount} arenas envolvidas</small> : null}{event.totalCents !== null ? <small>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(event.totalCents / 100)}</small> : null}</div>
        <span className="tw:grid tw:min-w-0 tw:gap-1 tw:text-xs"><span className="tw:min-w-0 tw:[overflow-wrap:anywhere]">{event.actorName}</span>{event.agent ? <AgentActionBadge name={event.actorName}/> : null}<AuditDetails>      <div className="tw:grid tw:min-w-0 tw:gap-3 tw:border-t tw:border-[var(--line)] tw:bg-white tw:p-3">
        <dl className="tw:m-0 tw:grid tw:min-w-0 tw:gap-1 tw:text-xs tw:text-[#354f70]"><div className="tw:break-all"><dt className="tw:inline tw:font-semibold">Registro: </dt><dd className="tw:m-0 tw:inline">{event.entityId}</dd></div><div className="tw:break-all"><dt className="tw:inline tw:font-semibold">Operação: </dt><dd className="tw:m-0 tw:inline">{event.action}</dd></div></dl>
        {event.changes.length ? <div className="tw:grid tw:min-w-0 tw:gap-2">{event.changes.map(change => <div key={change.key} className="tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] tw:gap-2 tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:p-3 tw:text-xs tw:viewport-480:grid-cols-1"><strong className="tw:col-span-full">{change.label}</strong><div className="tw:min-w-0 tw:whitespace-pre-wrap tw:break-words"><span className="tw:block tw:pb-1 tw:text-[#354f70]">Antes</span>{change.before}</div><div className="tw:min-w-0 tw:whitespace-pre-wrap tw:break-words"><span className="tw:block tw:pb-1 tw:text-[#354f70]">Depois</span>{change.after}</div></div>)}</div> : <p className="tw:m-0 tw:text-xs tw:text-[#354f70]">Este registro não possui alterações de campos disponíveis para exibição.</p>}
      </div>
</AuditDetails></span>
      </div>
      </article>;
    })}</div>
    <nav aria-label="Páginas da auditoria" className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">{page > 1 ? <Link href={href(page - 1)} className={ui.secondary}>Anterior</Link> : null}<span className="tw:text-xs">Página {page} de {Math.max(1, Math.ceil(total / 50))}</span>{page * 50 < total ? <Link href={href(page + 1)} className={ui.secondary}>Próxima</Link> : null}</nav>
  </section>;
}
