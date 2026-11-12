"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export function TournamentSectionNav({canManage,canViewTournaments}:{canManage:boolean;canViewTournaments:boolean}) {
 const path=usePathname()??"",query=useSearchParams();
 const active=path.startsWith("/torneios/rankings")?"rankings":path==="/torneios/inscricoes"?"registrations":path==="/torneios"&&query?.get("status")==="finished"?"finished":"events";
 const links=[{id:"events",label:"Eventos ativos",href:"/torneios"},{id:"finished",label:"Finalizados",href:"/torneios?status=finished"},...(canManage?[{id:"registrations",label:"Inscrições",href:"/torneios/inscricoes"}]:[]),...(canViewTournaments?[{id:"rankings",label:"Rankings",href:"/torneios/rankings"}]:[])];
 return <nav aria-label="Navegação de torneios" className="tw:flex tw:min-w-0 tw:flex-wrap tw:gap-1 tw:border-b tw:border-[var(--line)] tw:pb-2">{links.map(link=><Link key={link.id} href={link.href} scroll={false} aria-current={active===link.id?"page":undefined} className={active===link.id?ui.primary:ui.secondary}>{link.label}</Link>)}</nav>;
}
