"use client";
import Link from "next/link";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export function SponsorshipFilters({query,type,sort,planTypes,kind=""}:{query:string;type:string;sort:string;planTypes:string[];kind?:string}) {
 return <form method="get" role="search" aria-label="Filtros de planos" className={`${ui.filters} tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-[#f7f9fc] tw:p-2`}>
 <label className={`${ui.field} tw:w-[min(100%,260px)]`}>Pesquisar<input type="search" name="q" defaultValue={query} placeholder="Nome do plano" maxLength={120}/></label>
 <label className={`${ui.field} tw:w-[min(100%,190px)]`}>Finalidade<select name="kind" defaultValue={kind}><option value="">Todas</option><option value="FIXED_COURT">Reserva fixa de quadra</option><option value="SPONSORSHIP">Patrocínio</option></select></label>
 <label className={`${ui.field} tw:w-[min(100%,150px)]`}>Tipo<select name="type" defaultValue={type}><option value="">Todos</option>{planTypes.map(item=><option key={item}>{item}</option>)}</select></label>
 <label className={`${ui.field} tw:w-[min(100%,180px)]`}>Ordenar por<select name="sort" defaultValue={sort}><option value="name">Nome do plano</option><option value="value">Maior valor mensal</option><option value="companies">Mais vínculos</option></select></label>
 <button type="submit" className={ui.primary}>Filtrar</button>{query||type||kind||sort!=="name"?<Link href="/proximos-jogos/patrocinios" className={ui.neutral}>Limpar</Link>:null}
 </form>;
}
