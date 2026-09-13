import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublicAthleteIdentity } from "@/lib/auth/player-session";
import { getEventRadar } from "@/lib/services/event-radar";

export const dynamic = "force-dynamic";

export default async function EventRadarPage() {
  const [athlete, events] = await Promise.all([getPublicAthleteIdentity(), getEventRadar()]);
  if (!athlete) redirect("/portal");
  return <main className="athlete-portal-page"><section className="athlete-portal-hero"><div className="athlete-portal-hero-inner"><div className="athlete-portal-brand"><div className="athlete-portal-mark">⌁</div><div className="athlete-portal-brand-copy"><span>REDE DE ARENAS</span><h1>Radar de Eventos</h1></div></div><Link className="athlete-portal-profile-link" href="/portal">Minhas arenas</Link></div></section><section className="athlete-portal-content-panel event-radar"><header><span>TORNEIOS ABERTOS</span><h2>Encontre sua próxima disputa</h2><p>Eventos publicados pelas arenas da rede. Você entra pelo link oficial de cada organizadora.</p></header>{events.length ? <div>{events.map((event) => <article key={event.id}><div className="event-radar-arena">{event.arena.logoUrl ? <img src={event.arena.logoUrl} alt="" /> : <b>{event.arena.name.slice(0, 2).toUpperCase()}</b>}<span>{event.arena.name}</span></div><div className="event-radar-copy"><strong>{event.name}</strong><p>{event.description || "Confira as categorias e participe pelo link de inscrição."}</p><div>{event.categories.slice(0, 5).map((category) => <em key={category.id}>{category.name}</em>)}</div></div>{event.creationMode === "PUBLIC" && event.registrationPhase === "REGISTRATIONS" ? <Link className="button button-primary button-small" href={`/inscricao/${event.publicSlug}`}>Ver torneio</Link> : <span className="event-radar-status">Em andamento</span>}</article>)}</div> : <div className="portal-empty"><strong>Ainda não há torneios no radar.</strong><span>Quando uma arena publicar um evento, ele aparecerá aqui.</span></div>}</section></main>;
}
