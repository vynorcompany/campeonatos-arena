"use client";
import { submenuTabs } from "@/components/ui/submenu-tabs";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
export function TournamentSectionNav({canManage,canViewTournaments}:{canManage:boolean;canViewTournaments:boolean}) {
 const path=usePathname()??"",query=useSearchParams();
 const active=path.startsWith("/torneios/rankings")?"rankings":path==="/torneios/inscricoes"?"registrations":path==="/torneios"&&query?.get("status")==="finished"?"finished":"events";
 const links=[{id:"events",label:"Eventos ativos",href:"/torneios"},{id:"finished",label:"Finalizados",href:"/torneios?status=finished"},...(canManage?[{id:"registrations",label:"Inscrições",href:"/torneios/inscricoes"}]:[]),...(canViewTournaments?[{id:"rankings",label:"Rankings",href:"/torneios/rankings"}]:[])];
 return <nav aria-label="Navegação de torneios" className={submenuTabs.bar}>{links.map(link=><Link key={link.id} href={link.href} scroll={false} aria-current={active===link.id?"page":undefined} className={submenuTabs.item}>{link.label}</Link>)}</nav>;
}
