import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublicAthleteIdentity } from "@/lib/auth/player-session";
import { getEventRadar } from "@/lib/services/event-radar";

export const dynamic = "force-dynamic";

export default async function EventRadarPage({ searchParams }: { searchParams?: { view?: string } }) {
  const [athlete, events] = await Promise.all([getPublicAthleteIdentity(), getEventRadar()]);
  if (!athlete) redirect("/portal");
  const location = athlete.arenas.find((arena) => arena.city.trim()) ?? athlete.arenas[0];
  const city = location?.city.trim().toLocaleLowerCase("pt-BR") ?? "";
  const state = location?.state.trim().toLocaleUpperCase() ?? "";
  const nearby = city || state ? events.filter((event) => (city ? event.arena.city.trim().toLocaleLowerCase("pt-BR") === city : true) && (state ? event.arena.state.trim().toLocaleUpperCase() === state : true)) : [];
  const visibleEvents = searchParams?.view === "all" || !nearby.length ? events : nearby;
  const regionName = [location?.city, location?.state].filter(Boolean).join(" · ");
  return <main className="athlete-portal-page"><section className="athlete-portal-hero"><div className="athlete-portal-hero-inner"><div className="athlete-portal-brand"><div className="athlete-portal-mark">⌁</div><div className="athlete-portal-brand-copy"><span>REDE DE ARENAS</span><h1>Radar de Eventos</h1></div></div><Link className="athlete-portal-profile-link" href="/portal">Minhas arenas</Link></div></section><section className="athlete-portal-content-panel event-radar"><header><span>TORNEIOS ABERTOS</span><h2>{nearby.length && searchParams?.view !== "all" ? `Perto de você${regionName ? ` · ${regionName}` : ""}` : "Encontre sua próxima disputa"}</h2><p>{nearby.length && searchParams?.view !== "all" ? "Primeiro, mostramos torneios publicados na sua região." : "Eventos publicados pelas arenas da rede. Você entra pelo link oficial de cada organizadora."}</p>{nearby.length ? <div className="event-radar-view-toggle"><Link className={searchParams?.view === "all" ? "" : "active"} href="/portal/eventos">Na minha região</Link><Link className={searchParams?.view === "all" ? "active" : ""} href="/portal/eventos?view=all">Todo o Brasil</Link></div> : null}</header>{visibleEvents.length ? <div>{visibleEvents.map((event) => <article key={event.id}><div className="event-radar-arena">{event.arena.logoUrl ? <img src={event.arena.logoUrl} alt="" /> : <b>{event.arena.name.slice(0, 2).toUpperCase()}</b>}<span>{event.arena.name}<small>{[event.arena.city, event.arena.state].filter(Boolean).join(" · ") || "Localização não informada"}</small></span></div><div className="event-radar-copy"><strong>{event.name}</strong><p>{event.description || "Confira as categorias e participe pelo link de inscrição."}</p><div>{event.categories.slice(0, 5).map((category) => <em key={category.id}>{category.name}</em>)}</div></div>{event.creationMode === "PUBLIC" && event.registrationPhase === "REGISTRATIONS" ? <Link className="button button-primary button-small" href={`/inscricao/${event.publicSlug}`}>Ver torneio</Link> : <span className="event-radar-status">Em andamento</span>}</article>)}</div> : <div className="portal-empty"><strong>Nenhum torneio publicado nesta região.</strong><span>Veja os eventos das demais arenas da rede.</span><Link className="button button-small" href="/portal/eventos?view=all">Ver todo o Brasil</Link></div>}</section></main>;
}
