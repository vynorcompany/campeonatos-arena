import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublicAthleteIdentity } from "@/lib/auth/player-session";
import { PublicEventRadar } from "@/components/public-event-radar";

export const dynamic = "force-dynamic";

export default async function EventRadarPage(props: { searchParams?: Promise<{ view?: string }> }) {
  const searchParams = await props.searchParams;
  const athlete = await getPublicAthleteIdentity();
  if (!athlete) redirect("/portal");
  return <main className={viewStyles.athlete_portal_page}><section className={viewStyles.athlete_portal_hero}><div className={viewStyles.athlete_portal_hero_inner}><div className={viewStyles.athlete_portal_brand}><div className={viewStyles.athlete_portal_mark}>⌁</div><div className={viewStyles.athlete_portal_brand_copy}><span>REDE DE ARENAS</span><h1>Radar de Eventos</h1></div></div><Link className={viewStyles.athlete_portal_profile_link} href="/portal">← Voltar</Link></div></section><PublicEventRadar view={searchParams?.view === "all" ? "all" : "region"} /></main>;
}
