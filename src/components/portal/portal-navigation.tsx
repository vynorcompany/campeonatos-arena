import Link from "next/link";
import type { PortalMenuIcon, PortalMenuItem } from "@/lib/portal/menu";
import type { PortalSection } from "@/lib/portal/navigation";
export function PortalIcon({ icon, className = "tw:size-5" }: { icon: PortalMenuIcon; className?: string }) {
  const paths: Record<PortalMenuIcon, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-9 3v4m-2-2h4"/></>,
    reservations: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-11 5 2 2 4-4"/></>,
    lessons: <><path d="m2 9 10-5 10 5-10 5Zm4 2v6q6 5 12 0v-6M22 9v7"/></>,
    classes: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m2 3a6 6 0 0 1 3 5v2"/></>,
    events: <><path d="M8 3h8v6a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v6m-4 2h8"/></>,
    radar: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 6-7"/><circle cx="10" cy="16" r="1"/></>,
    receipt: <><path d="M5 3h14v19l-3-2-4 2-4-2-3 2Zm4 5h6m-6 4h6m-6 4h3"/></>,
    wallet: <><path d="M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h16v11H5a3 3 0 0 1-3-3V6m19 7h-6v4h6"/></>,
    bell: <><path d="M5 17h14l-2-4V9A5 5 0 0 0 7 9v4Zm5 4h4"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></>,
    teacher: <><path d="M3 3h18v12H10m-5-3v9m-3-5h8m-2-8h8"/><circle cx="5" cy="9" r="2"/></>,
  };
  return <svg className={`${className} tw:shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[icon]}</svg>;
}
export const portalCard = "tw:rounded-2xl tw:border tw:border-[#e1e9e6] tw:bg-white tw:shadow-[0_3px_16px_rgba(21,60,44,.04)] tw:dark:border-[#29483f] tw:dark:bg-[#102d25]";
export const portalInteractive = "tw:transition-[transform,box-shadow,border-color,background-color] tw:duration-200 tw:hover:-translate-y-1 tw:hover:border-[#91c4af] tw:hover:shadow-[0_12px_28px_rgba(14,79,52,.12)] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-4 tw:focus-visible:outline-[#078f7c] tw:active:translate-y-0 tw:motion-reduce:translate-x-0 tw:motion-reduce:translate-y-0 tw:motion-reduce:transition-none";
export function PortalSidebar({ items, current, href, arenaName, logoUrl }: { items: PortalMenuItem[]; current: string; href: (section: PortalSection) => string; arenaName: string; logoUrl: string }) {
  return <aside className="tw:sticky tw:top-0 tw:hidden tw:h-dvh tw:w-60 tw:shrink-0 tw:flex-col tw:border-r tw:border-[#e1e9e6] tw:bg-white tw:p-5 tw:dark:border-[#29483f] tw:dark:bg-[#102d25] tw:min-[1100px]:flex">
    <Link href={href("home")} className="tw:flex tw:items-center tw:gap-3 tw:py-3 tw:text-inherit tw:no-underline">{logoUrl ? <img src={logoUrl} alt="" className="tw:size-11 tw:rounded-xl tw:object-contain"/> : <span className="tw:grid tw:size-11 tw:place-items-center tw:rounded-xl tw:bg-[#e4f2eb] tw:font-bold tw:text-[#087b63]">{arenaName.slice(0,2)}</span>}<span className="tw:min-w-0"><small className="tw:block tw:text-[10px] tw:font-bold tw:tracking-[.14em] tw:text-[#778d83]">PORTAL DO ATLETA</small><strong className="tw:mt-1 tw:block tw:break-words tw:text-sm tw:leading-snug">{arenaName}</strong></span></Link>
    <nav className="tw:mt-6 tw:min-h-0 tw:flex-1 tw:overflow-y-auto tw:pr-1" aria-label="Navegação do portal">{[...new Set(items.map(item=>item.group))].map(group=><div key={group} className="tw:mb-5"><p className="tw:m-0 tw:mb-2 tw:px-3 tw:text-[10px] tw:font-semibold tw:tracking-[.12em] tw:text-[#607467] tw:uppercase">{group}</p>{items.filter(item=>item.group===group).map(item=><Link key={item.section} href={href(item.section)} aria-current={current===item.section ? "page" : undefined} className={`tw:mb-1 tw:flex tw:min-h-11 tw:items-center tw:gap-3 tw:rounded-xl tw:px-3 tw:py-2 tw:text-[13px] tw:font-medium tw:no-underline tw:transition-colors tw:focus-visible:outline-2 tw:focus-visible:outline-[#078f7c] ${current===item.section ? "tw:bg-[#e4f2eb] tw:text-[#087b63] tw:dark:bg-[#21483a] tw:dark:text-[#8de1b7]" : "tw:text-[#607467] tw:hover:bg-[#f1f7f3] tw:dark:text-[#b8ccc1] tw:dark:hover:bg-[#193c30]"}`}><PortalIcon icon={item.icon}/>{item.label}</Link>)}</div>)}</nav>
    <Link href="/portal" className="tw:mt-3 tw:flex tw:min-h-11 tw:items-center tw:justify-between tw:rounded-xl tw:border tw:border-[#e1e9e6] tw:px-3 tw:text-xs tw:font-medium tw:text-[#607467] tw:no-underline tw:dark:border-[#29483f] tw:dark:text-[#b8ccc1]">Trocar de arena<span aria-hidden="true">↗</span></Link>
  </aside>;
}
export function PortalBottomNav({ items, current, href }: { items: PortalMenuItem[]; current: string; href: (section: PortalSection) => string }) {
  const sections: PortalSection[]=["home","booking","leagues","finance","profile"];
  const links=sections.flatMap(section=>items.find(item=>item.section===section)??[]);
  return <nav aria-label="Atalhos principais" className="tw:fixed tw:inset-x-0 tw:bottom-0 tw:z-40 tw:flex tw:border-t tw:border-[#dce7e1] tw:bg-white/95 tw:px-2 tw:pt-2 tw:pb-[max(10px,env(safe-area-inset-bottom))] tw:shadow-[0_-4px_24px_rgba(20,57,39,.06)] tw:backdrop-blur-lg tw:dark:border-[#29483f] tw:dark:bg-[#102d25]/95 tw:min-[1100px]:hidden">{links.map(item=><Link key={item.section} href={href(item.section)} aria-current={current===item.section ? "page" : undefined} className={`tw:flex tw:min-h-12 tw:min-w-0 tw:flex-1 tw:flex-col tw:items-center tw:justify-center tw:gap-1 tw:rounded-xl tw:px-1 tw:text-[10px] tw:font-medium tw:no-underline tw:focus-visible:outline-2 tw:focus-visible:outline-[#078f7c] ${current===item.section ? "tw:bg-[#e8f5ed] tw:text-[#087b63] tw:dark:bg-[#21483a] tw:dark:text-[#8de1b7]" : "tw:text-[#607467] tw:dark:text-[#adc6b7]"}`}><PortalIcon icon={item.icon}/><span>{item.section==="booking" ? "Reservar" : item.section==="profile" ? "Perfil" : item.label}</span></Link>)}</nav>;
}
