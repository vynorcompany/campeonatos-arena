import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublicAthleteIdentity } from "@/lib/auth/player-session";
import { PublicEventRadar } from "@/components/public-event-radar";

export const dynamic = "force-dynamic";

export default async function EventRadarPage({ searchParams }: { searchParams?: { view?: string } }) {
  const athlete = await getPublicAthleteIdentity();
  if (!athlete) redirect("/portal");
  return <main className="athlete-portal-page"><section className="athlete-portal-hero"><div className="athlete-portal-hero-inner"><div className="athlete-portal-brand"><div className="athlete-portal-mark">⌁</div><div className="athlete-portal-brand-copy"><span>REDE DE ARENAS</span><h1>Radar de Eventos</h1></div></div><Link className="athlete-portal-profile-link athlete-portal-back-link" href="/portal">← Voltar</Link></div></section><PublicEventRadar view={searchParams?.view === "all" ? "all" : "region"} /></main>;
}
