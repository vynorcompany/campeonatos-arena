"use client";
import Link from "next/link";
import { useFilterMemory } from "@/components/filters/filter-memory";
import { PaginatedList } from "@/components/ui/list-pagination";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import type { RankingProfileWithLeaderboard } from "@/lib/services/ranking";
export function RankingList({ rankings }: {rankings:RankingProfileWithLeaderboard[]}) {
  const [query,setQuery]=useFilterMemory("rankings:query","");
  const [type,setType]=useFilterMemory("rankings:type","");
  const visible=rankings.filter(r=>(!type||r.type===type)&&r.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")));
  const columns="tw:grid-cols-[minmax(0,1fr)_110px_110px_100px_70px] tw:viewport-760:grid-cols-[minmax(0,1fr)_auto]";
  return <section className={ui.page} aria-label="Rankings ativos"><div className={ui.filters}><label className={`${ui.field} tw:max-w-[320px]`}>Pesquisar ranking<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nome do ranking" type="search"/></label><label className={ui.field}>Modalidade<select value={type} onChange={e=>setType(e.target.value)}><option value="">Todas</option><option value="PAIR">Duplas</option><option value="INDIVIDUAL">Individual</option></select></label><span className="tw:ml-auto tw:self-center tw:text-xs">{visible.length} {visible.length===1?"ranking":"rankings"}</span><Link href="/torneios/rankings/novo" className={ui.primary}>Novo ranking</Link></div><div className={ui.list}><div className={`${ui.head} ${columns}`}><span>Ranking</span><span>Modalidade</span><span>Modelo</span><span>Torneios</span><span>Ações</span></div><PaginatedList label="rankings">{visible.map(r=><article key={r.id} className={`${ui.row} ${columns}`}><div><strong>{r.name}</strong><small>{r.isGeneral?"Ranking geral":r.feedsGeneralRanking?"Alimenta o ranking geral":"Ranking específico"}</small></div><span className="tw:text-xs">{r.type==="PAIR"?"Duplas":"Individual"}</span><span className="tw:text-xs">{r.model==="LEAGUE"?"Liga":"Mata-mata"}</span><span className="tw:text-xs">{r._count.tournaments} torneios</span><Link href={`/torneios/rankings/${r.id}`} className={ui.secondary} aria-label={`Abrir ranking ${r.name}`}>Abrir</Link></article>)}{!visible.length?<p className={ui.empty}>Nenhum ranking encontrado.</p>:null}</PaginatedList></div></section>;
}
