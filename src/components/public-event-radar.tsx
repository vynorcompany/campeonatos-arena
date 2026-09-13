import Link from "next/link";
import { getPublicAthleteIdentity } from "@/lib/auth/player-session";
import { getEventRadar } from "@/lib/services/event-radar";

type PublicEventRadarProps = {
  embedded?: boolean;
  view?: "region" | "all";
  embeddedHref?: (view: "region" | "all") => string;
};

export async function PublicEventRadar({
  embedded = false,
  view = "region",
  embeddedHref,
}: PublicEventRadarProps) {
  const [athlete, events] = await Promise.all([getPublicAthleteIdentity(), getEventRadar()]);
  const location = athlete?.arenas.find((arena) => arena.city.trim()) ?? athlete?.arenas[0];
  const city = location?.city.trim().toLocaleLowerCase("pt-BR") ?? "";
  const state = location?.state.trim().toLocaleUpperCase() ?? "";
  const nearby = city || state
    ? events.filter((event) => (city ? event.arena.city.trim().toLocaleLowerCase("pt-BR") === city : true) && (state ? event.arena.state.trim().toLocaleUpperCase() === state : true))
    : [];
  const showingAll = view === "all" || !nearby.length;
  const visibleEvents = showingAll ? events : nearby;
  const regionName = [location?.city, location?.state].filter(Boolean).join(" · ");
  const hrefFor = (nextView: "region" | "all") => embeddedHref?.(nextView) ?? (nextView === "all" ? "/portal/eventos?view=all" : "/portal/eventos");

  return <section className={`athlete-portal-content-panel event-radar${embedded ? " event-radar-embedded" : ""}`}>
    <header>
      <span>TORNEIOS ABERTOS</span>
      <h2>{!showingAll ? `Perto de você${regionName ? ` · ${regionName}` : ""}` : "Encontre sua próxima disputa"}</h2>
      <p>{!showingAll ? "Primeiro, mostramos torneios publicados na sua região." : "Eventos publicados pelas arenas da rede. Você entra pelo link oficial de cada organizadora."}</p>
      {nearby.length ? <div className="event-radar-view-toggle"><Link className={!showingAll ? "active" : ""} href={hrefFor("region")}>Na minha região</Link><Link className={showingAll ? "active" : ""} href={hrefFor("all")}>Todo o Brasil</Link></div> : null}
    </header>
    {visibleEvents.length ? <div>{visibleEvents.map((event) => <article key={event.id}>
      <div className="event-radar-arena">{event.arena.logoUrl ? <img src={event.arena.logoUrl} alt="" /> : <b>{event.arena.name.slice(0, 2).toUpperCase()}</b>}<span>{event.arena.name}<small>{[event.arena.city, event.arena.state].filter(Boolean).join(" · ") || "Localização não informada"}</small></span></div>
      <div className="event-radar-copy"><strong>{event.name}</strong><p>{event.description || "Confira as categorias e participe pelo link de inscrição."}</p><div>{event.categories.slice(0, 5).map((category) => <em key={category.id}>{category.name}</em>)}</div></div>
      {event.creationMode === "PUBLIC" && event.registrationPhase === "REGISTRATIONS" ? <Link className="button button-primary button-small" href={`/inscricao/${event.publicSlug}`}>Ver torneio</Link> : <span className="event-radar-status">Em andamento</span>}
    </article>)}</div> : <div className="portal-empty"><strong>Nenhum torneio publicado nesta região.</strong><span>Veja os eventos das demais arenas da rede.</span><Link className="button button-small" href={hrefFor("all")}>Ver todo o Brasil</Link></div>}
  </section>;
}
