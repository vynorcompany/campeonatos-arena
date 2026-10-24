import { PortalIcon, portalCard, portalInteractive } from "@/components/portal/portal-navigation";
import Link from "next/link";
import { GlobalAthleteAuthForm } from "@/components/global-athlete-auth-form";
import { AthletePortalLoginLayout } from "@/components/athlete-portal-login-layout";
import { logoutAthletePortalAction } from "@/lib/actions/player-auth";
import { getPublicAthleteIdentity } from "@/lib/auth/player-session";

export const dynamic = "force-dynamic";

export default async function GlobalAthletePortalPage() {
  const athlete = await getPublicAthleteIdentity();
  if (!athlete) return <AthletePortalLoginLayout><GlobalAthleteAuthForm /></AthletePortalLoginLayout>;
  return <main className="athlete-portal-page tw:min-h-dvh tw:bg-[#f4f7f3] tw:px-4 tw:py-6 tw:text-[#203c2e] tw:dark:bg-[#09251d] tw:dark:text-[#eaf3e9] tw:[&_*]:box-border tw:min-[700px]:p-10"><div className="tw:mx-auto tw:max-w-[1000px]">
    <header className="tw:mb-12 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4"><Link href="/portal" className="tw:flex tw:items-center tw:gap-3 tw:text-inherit tw:no-underline"><img src="/icon.svg?v=padel-2" alt="" className="tw:size-11 tw:rounded-xl"/><span className="tw:text-xs tw:font-semibold tw:tracking-[.12em]">PORTAL DO ATLETA</span></Link><div className="tw:flex tw:items-center tw:gap-4"><Link href="/portal/eventos" className="tw:text-xs tw:font-medium tw:text-[#347955] tw:no-underline tw:dark:text-[#a5dcaf]">Radar de eventos ↗</Link><form action={logoutAthletePortalAction}><button type="submit" className="tw:min-h-10 tw:cursor-pointer tw:rounded-xl tw:border tw:border-[#dce7df] tw:bg-transparent tw:px-4 tw:text-xs tw:text-inherit tw:dark:border-[#29483f]">Sair</button></form></div></header>
    <section><p className="tw:m-0 tw:text-[10px] tw:font-semibold tw:tracking-[.12em] tw:text-[#607467] tw:dark:text-[#aac2b5]">SEU PONTO DE PARTIDA</p><h1 className="tw:mt-3 tw:mb-2 tw:text-3xl tw:font-semibold tw:tracking-tight tw:min-[700px]:text-4xl">Onde vamos jogar hoje?</h1><p className="tw:m-0 tw:text-sm tw:leading-relaxed tw:text-[#607467] tw:dark:text-[#aac2b5]">Escolha uma arena para acessar seus horários, eventos e sua conta.</p>
    <div className="tw:mt-8 tw:grid tw:gap-4 tw:min-[700px]:grid-cols-2">{athlete.arenas.map(arena=><Link href={`/home?arena=${encodeURIComponent(arena.slug)}`} key={arena.slug} className={`${portalCard} ${portalInteractive} tw:group tw:flex tw:min-w-0 tw:items-center tw:gap-4 tw:p-5 tw:text-inherit tw:no-underline`}>{arena.logoUrl ? <img src={arena.logoUrl} alt="" className="tw:size-16 tw:shrink-0 tw:rounded-2xl tw:object-contain"/> : <span className="tw:grid tw:size-16 tw:shrink-0 tw:place-items-center tw:rounded-2xl tw:bg-[#e4f2eb] tw:text-lg tw:font-bold tw:text-[#087b63]">{arena.name.slice(0,2).toUpperCase()}</span>}<span className="tw:min-w-0 tw:flex-1"><strong className="tw:block tw:break-words tw:text-base tw:font-semibold">{arena.name}</strong><small className="tw:mt-1 tw:block tw:text-xs tw:text-[#607467] tw:dark:text-[#aac2b5]">{arena.playerName}</small><span className="tw:mt-3 tw:block tw:text-xs tw:font-medium tw:text-[#347955] tw:dark:text-[#a5dcaf]">Entrar na arena →</span></span><PortalIcon icon="calendar" className="tw:size-5 tw:text-[#a2b8a8]"/></Link>)}</div>{!athlete.arenas.length ? <p className={`${portalCard} tw:mt-8 tw:p-6 tw:text-sm`}>Você ainda não tem uma arena vinculada. Use o link da sua arena para fazer o primeiro cadastro.</p> : null}</section>
  </div></main>;
}
