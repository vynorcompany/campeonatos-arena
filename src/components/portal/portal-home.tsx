import Link from "next/link";
import { PadelBackdrop } from "./padel-backdrop";
import type { PortalMenuItem } from "@/lib/portal/menu";
import type { PortalSection } from "@/lib/portal/navigation";
import { getPortalGreeting } from "@/lib/portal/greeting";
import { PortalRichText } from "@/components/portal-rich-text";
import { ClientPortalEventCarousel } from "@/components/client-portal-event-carousel";
import { PortalIcon, portalCard } from "./portal-navigation";

const menuTones: Record<PortalSection, string> = {
  home: "tw:text-[#1e5ea8] tw:dark:text-[#94bdff]",
  schedule: "tw:text-[#087f75] tw:dark:text-[#5fddcd]",
  booking: "tw:text-[#087f75] tw:dark:text-[#5fddcd]",
  reservations: "tw:text-[#087f75] tw:dark:text-[#5fddcd]",
  lessons: "tw:text-[#6743a5] tw:dark:text-[#c5a7ff]",
  classes: "tw:text-[#4555a5] tw:dark:text-[#aebaff]",
  leagues: "tw:text-[#965015] tw:dark:text-[#f2ba7c]",
  radar: "tw:text-[#9f346e] tw:dark:text-[#f1a6cf]",
  comandas: "tw:text-[#9f4435] tw:dark:text-[#ffb6a6]",
  finance: "tw:text-[#087443] tw:dark:text-[#85dbaf]",
  announcements: "tw:text-[#866008] tw:dark:text-[#edce86]",
  profile: "tw:text-[#1e5ea8] tw:dark:text-[#94bdff]",
  teacher: "tw:text-[#0c687a] tw:dark:text-[#86d8e9]",
};

type Home = NonNullable<Awaited<ReturnType<typeof import("@/lib/services/public-client-home").getPublicClientHome>>>;
export function PortalHome({ home, name, items, href, bookingHref }: { home: Home | null; name: string; items: PortalMenuItem[]; href: (section: PortalSection)=>string; bookingHref: string }) {
  if (!home) return <section className={`${portalCard} portal-home-panel tw:p-6`}><h2 className="tw:m-0 tw:font-semibold">Não foi possível carregar o início</h2><p className="tw:m-0 tw:mt-2 tw:text-sm">Tente atualizar a página. Os recursos continuam disponíveis na navegação.</p></section>;
  const firstName=name.trim().split(/\s+/)[0]||name;
  const next=items.some(item=>item.section==="reservations") ? home.upcomingReservations?.[0] : undefined;
  const can=(section:PortalSection)=>items.some(item=>item.section===section);
  const status=home.summary.mobileFinancialStatus;
  const muted="tw:text-[#606874] tw:dark:text-[#aab4c2]";
  return <div className="client-portal-home portal-home tw:grid tw:min-w-0 tw:gap-6 tw:[&_.portal-home-panel]:rounded-[5px]">
    <header><h1 className="tw:m-0 tw:text-[clamp(1.65rem,3vw,2.3rem)] tw:leading-tight tw:font-semibold tw:tracking-[-.03em]">{getPortalGreeting(new Date())}, {firstName}<span className="tw:text-[#3b6298]">.</span></h1></header>
    <div className="tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)] tw:gap-0">
      {can("schedule") ? <section className="portal-padel-hero tw:relative tw:isolate tw:min-w-0 tw:overflow-hidden tw:rounded-[5px] tw:border tw:border-[#2c4870] tw:bg-[#10243f] tw:bg-[linear-gradient(115deg,#174983_20%,#1e5ea8_100%)] tw:p-5 tw:text-white tw:min-[700px]:p-7">
        <PadelBackdrop />
        <div className="tw:relative tw:z-10">
          <h2 className="tw:mt-0 tw:mb-0 tw:max-w-[280px] tw:text-[30px] tw:leading-[1.07] tw:font-semibold tw:tracking-[-.03em] tw:min-[700px]:max-w-[350px] tw:min-[700px]:text-[38px]">Seu próximo jogo<br/>começa aqui<span className="tw:text-[#75aaf4]">.</span></h2>
          <p className="tw:mt-3 tw:mb-0 tw:max-w-[230px] tw:text-sm tw:leading-relaxed tw:text-[#d2dbe7]">Encontre sua quadra, escolha um horário e entre em jogo.</p>
          <Link data-portal-booking-cta="true" href={bookingHref} className="tw:mt-5 tw:inline-flex tw:min-h-12 tw:items-center tw:justify-center tw:gap-4 tw:rounded-[5px] tw:bg-[#087443] tw:px-5 tw:py-3 tw:text-sm tw:font-medium tw:text-white tw:no-underline tw:shadow-[0_4px_16px_rgba(0,0,0,.12)] tw:transition-colors tw:hover:bg-[#065b35] tw:hover:text-white tw:focus-visible:outline-2 tw:focus-visible:outline-offset-4 tw:focus-visible:outline-white"><PortalIcon icon="calendar"/>Reservar quadra<span aria-hidden="true">↗</span></Link>
          {next ? <Link href={href("reservations")} className="tw:mt-5 tw:flex tw:items-start tw:gap-2 tw:border-t tw:border-white/20 tw:pt-3 tw:text-xs tw:leading-relaxed tw:text-[#e0e6ee] tw:no-underline"><PortalIcon icon="reservations" className="tw:mt-0.5 tw:size-4"/><span className="tw:min-w-0"><strong className="tw:block tw:font-semibold">Sua próxima reserva</strong><span className="tw:block tw:break-words">{next.title} · {next.courtName} · {next.when}</span></span><span className="tw:ml-auto" aria-hidden="true">›</span></Link> : null}
        </div>
      </section> : null}
      {home.financialVisible !== false ? <section className="client-portal-summary tw:min-w-0 tw:border-b tw:border-[var(--portal-line)] tw:py-4" aria-label="Resumo financeiro">
        <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4">
          <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-3"><span className={`tw:grid tw:size-6 tw:shrink-0 tw:place-items-center ${status==="overdue" ? "tw:text-[#b42318] tw:dark:text-[#ffb4aa]" : status==="soon" ? "tw:text-[#8a5b0b] tw:dark:text-[#f2d08c]" : "tw:text-[#087443] tw:dark:text-[#85dbaf]"}`}><PortalIcon icon="wallet"/></span><div><h2 className="tw:m-0 tw:text-xs tw:font-normal tw:text-[var(--portal-muted)]">Minha conta</h2><p className={`tw:m-0 tw:mt-1 tw:text-base tw:font-medium ${status==="overdue" ? "tw:text-[#b42318] tw:dark:text-[#ffb4aa]" : status==="soon" ? "tw:text-[#8a5b0b] tw:dark:text-[#f2d08c]" : "tw:text-[#087443] tw:dark:text-[#85dbaf]"}`}>{home.summary.mobileFinancialLabel}</p></div></div>
          <Link href={href("finance")} className="tw:inline-flex tw:min-h-9 tw:items-center tw:gap-2 tw:rounded-[5px] tw:px-1 tw:py-2 tw:text-xs tw:font-normal tw:text-[#174983] tw:dark:text-[#a5bcdc] tw:no-underline tw:hover:underline">{status==="healthy" ? "Ver histórico" : "Ver pagamentos"}<span aria-hidden="true">→</span></Link>
        </div>
        {home.summary.financial !== "Em dia" || home.summary.futureFinancial ? <div className="tw:mt-4 tw:border-t tw:border-[var(--portal-line)] tw:pt-3 tw:text-sm tw:leading-relaxed"><p className="tw:m-0">{home.summary.financial !== "Em dia" ? home.summary.financial : null}</p>{home.summary.futureFinancial ? <p className="tw:m-0 tw:mt-1 tw:text-xs tw:text-[var(--portal-muted)]">{home.summary.futureFinancial}</p> : null}</div> : null}
      </section> : null}
    </div>
    <section id="portal-menu"><div className="tw:mb-4 tw:flex tw:items-center tw:justify-between tw:gap-3"><div><h2 className="tw:m-0 tw:text-lg tw:font-semibold tw:tracking-tight">Explore seu portal</h2></div></div>
      <nav aria-label="Atalhos do portal" className="client-portal-shortcuts tw:grid tw:min-w-0 tw:grid-cols-2 tw:gap-3 tw:min-[700px]:grid-cols-3 tw:min-[1200px]:grid-cols-5">{items.filter(item=>item.section!=="home").map(item=><Link key={item.section} href={href(item.section)} className="portal-menu-card tw:group tw:flex tw:min-h-[94px] tw:min-w-0 tw:flex-col tw:items-start tw:justify-center tw:gap-3 tw:rounded-[5px] tw:border tw:border-[var(--portal-line)] tw:bg-[var(--portal-surface)] tw:p-3 tw:text-inherit tw:no-underline tw:transition-colors tw:hover:border-[#174983] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:dark:focus-visible:outline-[#a5bcdc]"><PortalIcon icon={item.icon} className={`tw:size-5 ${menuTones[item.section]}`}/><strong className="tw:text-xs tw:font-medium tw:leading-snug">{item.label}</strong></Link>)}</nav>
    </section>
    <div className="tw:grid tw:min-w-0 tw:gap-4 tw:min-[800px]:grid-cols-2"><section className={`${portalCard} portal-home-panel tw:min-w-0 tw:p-5`}><header className="tw:mb-4 tw:flex tw:items-center tw:justify-between tw:gap-3"><h2 className="tw:m-0 tw:text-sm tw:font-semibold">Avisos da arena</h2><Link href={href("announcements")} className="tw:text-xs tw:font-medium tw:text-[#244a7f] tw:no-underline tw:dark:text-[#a5bcdc]">Ver todos →</Link></header>{home.announcements.length ? home.announcements.slice(0,2).map(item=><article key={item.id} className="tw:mb-3 tw:border-t tw:border-[#e8ebee] tw:pt-3 tw:dark:border-[#293648]"><strong className="tw:text-sm">{item.title}</strong><div className={`tw:mt-2 tw:line-clamp-3 tw:break-words tw:text-xs tw:leading-relaxed ${muted}`}><PortalRichText text={item.message}/></div></article>) : <p className={`tw:m-0 tw:text-sm tw:leading-relaxed ${muted}`}>Nenhum aviso por aqui. As novidades da arena aparecem neste espaço.</p>}</section><section className={`${portalCard} portal-home-panel tw:min-w-0 tw:p-5`}><header className="tw:mb-4 tw:flex tw:items-center tw:justify-between tw:gap-3"><h2 className="tw:m-0 tw:text-sm tw:font-semibold">Sua agenda</h2>{can("reservations") ? <Link href={href("reservations")} className="tw:text-xs tw:font-medium tw:text-[#244a7f] tw:no-underline tw:dark:text-[#a5bcdc]">Ver reservas →</Link> : null}</header>{can("reservations")&&home.upcomingReservations?.length ? home.upcomingReservations.map(item=><Link key={item.id} href={href("reservations")} className="tw:flex tw:min-h-16 tw:items-center tw:gap-3 tw:border-t tw:border-[#e8ebee] tw:py-3 tw:text-inherit tw:no-underline tw:dark:border-[#293648]"><PortalIcon icon="reservations" className="tw:size-5 tw:text-[#345179]"/><span className="tw:min-w-0"><strong className="tw:block tw:break-words tw:text-xs">{item.title}</strong><small className={`tw:mt-1 tw:block tw:text-[11px] ${muted}`}>{item.courtName} · {item.when}</small></span><span className="tw:ml-auto" aria-hidden="true">›</span></Link>) : <p className={`tw:m-0 tw:text-sm tw:leading-relaxed ${muted}`}>Sua agenda está livre. Que tal combinar o próximo jogo?</p>}</section></div>
    {home.charges.length ? <section className={`${portalCard} portal-home-panel tw:p-5`}><h2 className="tw:m-0 tw:mb-4 tw:text-sm tw:font-semibold">Pagamentos disponíveis</h2><div className="tw:grid tw:gap-3">{home.charges.map(charge=><article key={charge.id} className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-t tw:border-[#e8ebee] tw:pt-3 tw:dark:border-[#293648]"><div className="tw:min-w-0"><strong className="tw:block tw:break-words tw:text-sm">{charge.description}</strong><small className={`tw:mt-1 tw:block tw:text-xs ${muted}`}>{charge.amount} · vence em {charge.dueDate}</small></div><a href={charge.paymentUrl} className="tw:rounded-[5px] tw:bg-[#087443] tw:px-4 tw:py-3 tw:text-xs tw:font-semibold tw:text-white tw:no-underline">Pagar agora ↗</a></article>)}</div></section> : null}
    <section className={`${portalCard} portal-home-panel tw:min-w-0 tw:p-5`}><header className="tw:mb-4 tw:flex tw:items-center tw:justify-between tw:gap-3"><h2 className="tw:m-0 tw:text-sm tw:font-semibold">Acontece na arena</h2><Link href="/portal/eventos" className="tw:text-xs tw:font-medium tw:text-[#244a7f] tw:no-underline tw:dark:text-[#a5bcdc]">Radar de eventos →</Link></header>{home.eventPosts.length ? <ClientPortalEventCarousel events={home.eventPosts}/> : <p className={`tw:m-0 tw:text-sm tw:leading-relaxed ${muted}`}>Em breve, novos eventos para entrar no seu calendário.</p>}</section>
  </div>;
}
