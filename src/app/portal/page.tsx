import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { GlobalAthleteAuthForm } from "@/components/global-athlete-auth-form";
import { AthletePortalLoginLayout } from "@/components/athlete-portal-login-layout";
import { logoutAthletePortalAction } from "@/lib/actions/player-auth";
import { getPublicAthleteIdentity } from "@/lib/auth/player-session";

export const dynamic = "force-dynamic";

export default async function GlobalAthletePortalPage() {
  const athlete = await getPublicAthleteIdentity();
  if (!athlete) return <AthletePortalLoginLayout><GlobalAthleteAuthForm /></AthletePortalLoginLayout>;
  return <main className={viewStyles.athlete_portal_page}><section className={viewStyles.athlete_portal_hero}><div className={viewStyles.athlete_portal_hero_inner}><div className={viewStyles.athlete_portal_brand}><div className={viewStyles.athlete_portal_mark}>AP</div><div className={viewStyles.athlete_portal_brand_copy}><span>CONTA DO ATLETA</span><h1>Minhas arenas</h1></div></div><div className={viewStyles.athlete_portal_global_actions}><Link className={viewStyles.athlete_portal_profile_link} href="/portal/eventos">Radar de Eventos</Link><form action={logoutAthletePortalAction} className={viewStyles.athlete_portal_logout}><button type="submit">Sair</button></form></div></div></section><section className={viewStyles.athlete_portal_content_panel_global_athlete_arenas}><header><span>SELECIONE A ARENA</span><h2>Onde vamos jogar hoje?</h2></header><div>{athlete.arenas.map((arena) => <a href={`/home?arena=${encodeURIComponent(arena.slug)}`} key={arena.slug}>{arena.logoUrl ? <img src={arena.logoUrl} alt="" /> : <b>{arena.name.slice(0, 2).toUpperCase()}</b>}<span><strong>{arena.name}</strong><small>Entrar como {arena.playerName}</small></span><i>→</i></a>)}</div></section></main>;
}
