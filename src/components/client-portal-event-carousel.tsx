"use client";

import { useRef, useState } from "react";
import { PortalRichText } from "@/components/portal-rich-text";

export type ClientPortalEvent = {
  id: string;
  title: string;
  caption: string | null;
  imageUrl: string;
  linkUrl: string | null;
};

function EventCard({ event }: { event: ClientPortalEvent }) {
  const image = <img src={event.imageUrl} alt={event.linkUrl ? `Abrir ${event.title}` : event.title} />;

  return (
    <article>
      {event.linkUrl ? <a className="client-portal-event-link" href={event.linkUrl} target="_blank" rel="noreferrer">{image}</a> : image}
      <div>
        <strong>{event.title}</strong>
        {event.caption ? <p><PortalRichText text={event.caption} /></p> : null}
      </div>
    </article>
  );
}

export function ClientPortalEventCarousel({ events }: { events: ClientPortalEvent[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  if (events.length <= 1) {
    return <div className="client-portal-event-posts">{events.map((event) => <EventCard key={event.id} event={event} />)}</div>;
  }

  const move = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.max(track.clientWidth * .86, 240), behavior: "smooth" });
  };

  return (
    <section className="client-portal-event-carousel" aria-label="Eventos em destaque">
      <div
        className="client-portal-event-carousel-track"
        ref={trackRef}
        onScroll={(event) => {
          const track = event.currentTarget;
          const step = Math.max(track.clientWidth * .86, 240);
          setCurrent(Math.min(events.length - 1, Math.max(0, Math.round(track.scrollLeft / step))));
        }}
      >
        {events.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
      <div className="client-portal-event-carousel-controls">
        <button type="button" onClick={() => move(-1)} aria-label="Evento anterior">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7" /></svg>
        </button>
        <span aria-live="polite">{current + 1} de {events.length}</span>
        <button type="button" onClick={() => move(1)} aria-label="Próximo evento">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 5 7 7-7 7" /></svg>
        </button>
      </div>
    </section>
  );
}
