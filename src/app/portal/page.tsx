import { redirect } from "next/navigation";
import { GlobalAthleteAuthForm } from "@/components/global-athlete-auth-form";
import { getPublicAthleteIdentity } from "@/lib/auth/player-session";

export const dynamic = "force-dynamic";

export default async function GlobalAthletePortalPage() {
  const athlete = await getPublicAthleteIdentity();
  if (!athlete) return <main className="athlete-portal-page"><section className="athlete-portal-auth"><GlobalAthleteAuthForm /></section></main>;
  if (athlete.arenas.length === 1) redirect(`/classificacao/${athlete.arenas[0].slug}`);
  return <main className="athlete-portal-page"><section className="athlete-portal-hero"><div className="athlete-portal-hero-inner"><div className="athlete-portal-brand"><div className="athlete-portal-mark">AP</div><div className="athlete-portal-brand-copy"><span>CONTA DO ATLETA</span><h1>Minhas arenas</h1></div></div></div></section><section className="athlete-portal-content-panel global-athlete-arenas"><header><span>SELECIONE A ARENA</span><h2>Onde vamos jogar hoje?</h2></header><div>{athlete.arenas.map((arena) => <a href={`/classificacao/${arena.slug}`} key={arena.slug}>{arena.logoUrl ? <img src={arena.logoUrl} alt="" /> : <b>{arena.name.slice(0, 2).toUpperCase()}</b>}<span><strong>{arena.name}</strong><small>Entrar como {arena.playerName}</small></span><i>→</i></a>)}</div></section></main>;
}
