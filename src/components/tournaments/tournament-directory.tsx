"use client";
import { useFilterMemory } from "@/components/filters/filter-memory";
import Link from "next/link";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { ActionIcon, actionIconButton } from "@/components/ui/action-icon";
type Event = {id:string;name:string;registrationPhase:string;categories:{id:string;name:string}[]};
export function TournamentDirectory({events,path,canManage}:{events:Event[];path:string;canManage:boolean}) {
  const [query,setQuery]=useFilterMemory(`tournament-directory:${path}`, "");
  const visible=events.filter(event=>event.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")));
  return <section className={ui.page} aria-label="Eventos em operação">
    <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-2">
      <label className="tw:flex tw:w-full tw:max-w-[320px] tw:items-center tw:gap-2 tw:rounded-md tw:border tw:border-[#c7d8eb] tw:bg-white tw:px-2"><ActionIcon name="search"/><input className="tw:h-8! tw:min-h-8! tw:min-w-0 tw:flex-1 tw:border-0! tw:bg-transparent! tw:px-0! tw:text-xs! tw:shadow-none!" aria-label="Pesquisar eventos" placeholder="Pesquisar eventos" value={query} onChange={e=>setQuery(e.target.value)}/>{query?<button className={actionIconButton} type="button" aria-label="Limpar pesquisa de eventos" onClick={()=>setQuery("")}><ActionIcon name="close"/></button>:null}</label>
      <span className="tw:text-xs tw:text-[#526781]">{visible.length} {visible.length===1?"evento":"eventos"}</span>
    </div>
    <div className={ui.list}><div className={`${ui.head} tw:grid-cols-[minmax(0,1fr)_130px_130px_190px]`}><span>Evento</span><span>Categorias</span><span>Situação</span><span className="tw:text-right">Ações</span></div>
      {visible.map(event=><article key={event.id} className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_130px_130px_190px] tw:viewport-760:grid-cols-[minmax(0,1fr)_auto]`}>
        <div><strong>{event.name}</strong><small>{event.categories.map(c=>c.name).join(" · ")||"Sem categorias"}</small></div>
        <span className="tw:text-xs tw:viewport-760:row-start-2">{event.categories.length} {event.categories.length===1?"categoria ativa":"categorias ativas"}</span>
        <span className="tw:w-fit tw:rounded tw:bg-[#edf3fa] tw:px-2 tw:py-1 tw:text-[11px] tw:text-[#174983]">{{REGISTRATIONS:"Inscrições abertas",LIVE:"Em andamento",FINISHED:"Finalizado",EDITING:"Em configuração"}[event.registrationPhase]??"Em configuração"}</span>
        <div className="tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:viewport-760:col-span-full"><Link href={`${path}${path.includes("?")?"&":"?"}tournamentId=${encodeURIComponent(event.id)}`} className={ui.secondary}>{canManage?"Categorias":"Ver jogos"}</Link>{canManage?<Link href={`/torneios/${event.id}`} className={ui.primary}>Abrir evento</Link>:null}</div>
      </article>)}
      {!visible.length?<p className={ui.empty}>Nenhum evento encontrado.</p>:null}
    </div>
  </section>;
}
