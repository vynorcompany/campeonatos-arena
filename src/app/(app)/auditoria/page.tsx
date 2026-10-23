import { requireRole } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";

const actionLabels: Record<string, string> = { COURT_CHECKIN: "Check-in confirmado", COMANDA_DELETED: "Comanda excluída", AGENT_KEY_CREATED: "Chave de agente criada", AGENT_KEY_REVOKED: "Chave de agente revogada", FINANCIAL_ENTRY_CREATED: "Lançamento financeiro criado" };

export default async function AuditPage() {
  const auth = await requireRole("ADMIN");
  const events = await arenaDatabase(auth.arenaId).auditEvent.findMany({
    where: { arenaId: auth.arenaId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100,
  });
  return <section className="tw:grid tw:min-w-0 tw:gap-5">
    <header><h1 className="tw:m-0 tw:text-xl tw:font-semibold tw:text-[#132d58]">Auditoria</h1><p className="tw:text-sm tw:text-[#607898]">Últimos 100 registros da arena. Horários de Brasília.</p></header>
    <div className="tw:grid tw:overflow-hidden tw:rounded-xl tw:border tw:border-[#dce7f2] tw:bg-white">
      {!events.length ? <p className="tw:p-5 tw:text-sm tw:text-[#607898]">Nenhum registro de auditoria disponível.</p> : events.map(event => {
        const details = event.details && typeof event.details === "object" && !Array.isArray(event.details) ? event.details : {};
        return <article key={event.id} className="tw:grid tw:min-w-0 tw:gap-3 tw:border-b tw:border-[#e8eef5] tw:p-4 tw:last:border-b-0 tw:md:grid-cols-[180px_minmax(0,1fr)_minmax(120px,180px)]">
          <time dateTime={event.createdAt.toISOString()} className="tw:text-xs tw:text-[#607898]">{new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "medium" }).format(event.createdAt)}</time>
          <div className="tw:min-w-0"><strong className="tw:text-sm tw:text-[#132d58]">{actionLabels[event.action] ?? event.action}</strong><p className="tw:my-1 tw:break-words tw:text-sm">{String(details.code ?? details.name ?? details.description ?? event.entityId)} · {String(details.label ?? "")}</p>{typeof details.totalCents === "number" ? <span className="tw:text-xs tw:text-[#607898]">{event.action === "COMANDA_DELETED" ? "Valor dos itens" : "Valor registrado"}: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(details.totalCents / 100)}</span> : null}</div>
          <span className="tw:break-words tw:text-sm tw:text-[#607898]">{event.actorName}</span>
        </article>;
      })}
    </div>
  </section>;
}
