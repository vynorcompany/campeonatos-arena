"use client";
import { viewStyles } from "./client-portal-event-carousel.utilities";

import { useEffect, useRef, useState } from "react";
import { PortalRichText } from "@/components/portal-rich-text";

export type ClientPortalEvent = {
  id: string;
  title: string;
  caption: string | null;
  imageUrl: string;
  linkUrl: string | null;
};

function EventCard({ event }: { event: ClientPortalEvent }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => setImageFailed(false), [event.imageUrl]);
  useEffect(() => {
    const image = imageRef.current;
    if (!imageFailed && image?.complete && image.naturalWidth === 0) setImageFailed(true);
  }, [event.imageUrl, imageFailed]);
  const image = imageFailed ? <div className={viewStyles.client_portal_event_image_fallback} aria-label={`Imagem indisponível para ${event.title}`}>{event.title.slice(0, 2).toUpperCase()}</div> : <img ref={imageRef} src={event.imageUrl} alt={event.linkUrl ? `Abrir ${event.title}` : event.title} onError={() => setImageFailed(true)} />;

  return (
    <article>
      {event.linkUrl ? <a className={viewStyles.client_portal_event_link} href={event.linkUrl} target="_blank" rel="noreferrer">{image}</a> : image}
      <div className="portal-event-copy">
        <strong>{event.title}</strong>
        {event.caption ? <p><PortalRichText text={event.caption} /></p> : null}
      </div>
    </article>
  );
}

export function ClientPortalEventCarousel({ events }: { events: ClientPortalEvent[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [navigation, setNavigation] = useState({ previous: false, next: false });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
      const remaining = track.scrollWidth - track.clientWidth - track.scrollLeft;
      setNavigation({ previous: track.scrollLeft > 1, next: remaining > 1 });
      const first = track.firstElementChild as HTMLElement | null;
      const second = first?.nextElementSibling as HTMLElement | null;
      const step = second && first ? second.offsetLeft - first.offsetLeft : track.clientWidth;
      setCurrent(Math.min(events.length - 1, Math.max(0, Math.round(track.scrollLeft / Math.max(step, 1)))));
    };
    const resize = new ResizeObserver(update);
    resize.observe(track);
    track.addEventListener("scroll", update);
    update();
    return () => { resize.disconnect(); track.removeEventListener("scroll", update); };
  }, [events.length]);

  if (events.length <= 1) {
    return <div className={viewStyles.client_portal_event_posts}>{events.map((event) => <EventCard key={event.id} event={event} />)}</div>;
  }

  const move = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.max(track.clientWidth * .86, 240), behavior: "smooth" });
  };

  return (
    <section className={viewStyles.client_portal_event_carousel} aria-label="Eventos em destaque">
      <div
        className={viewStyles.client_portal_event_carousel_track}
        ref={trackRef}

      >
        {events.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
      {navigation.previous || navigation.next ? <div className={viewStyles.client_portal_event_carousel_controls}>
        <button type="button" onClick={() => move(-1)} disabled={!navigation.previous} aria-label="Evento anterior">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7" /></svg>
        </button>
        <span aria-live="polite">{current + 1} de {events.length}</span>
        <button type="button" onClick={() => move(1)} disabled={!navigation.next} aria-label="Próximo evento">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 5 7 7-7 7" /></svg>
        </button>
      </div> : null}
    </section>
  );
}
