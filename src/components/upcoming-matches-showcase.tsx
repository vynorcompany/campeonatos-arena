"use client";

import { useEffect, useState } from "react";

type UpcomingMatch = {
  id: string;
  label: string;
  stageLabel: string;
  groupName: string | null;
  homePairName: string | null;
  awayPairName: string | null;
  courtName: string | null;
  orderLabel: string;
};

type UpcomingMatchesShowcaseProps = {
  tournamentName: string;
  stageTitle: string;
  stageDescription: string;
  matches: UpcomingMatch[];
};

export function UpcomingMatchesShowcase({
  tournamentName,
  stageTitle,
  stageDescription,
  matches
}: UpcomingMatchesShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [matches.length]);

  useEffect(() => {
    if (matches.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % matches.length);
    }, 8000);

    return () => window.clearInterval(timer);
  }, [matches.length]);

  if (!matches.length) {
    return (
      <section className="showcase-shell showcase-shell-empty">
        <div className="showcase-hero">
          <div className="showcase-kicker-row">
            <span className="showcase-kicker">Próximos jogos</span>
            <span className="showcase-badge">Aguardando agenda</span>
          </div>
          <h2>{tournamentName}</h2>
          <p>{stageDescription}</p>
        </div>

        <article className="showcase-empty-card">
          <strong>Nenhum confronto pendente no momento</strong>
          <p>Assim que a fase atual tiver partidas disponíveis, elas aparecem aqui em formato de apresentação.</p>
        </article>
      </section>
    );
  }

  const activeMatch = matches[activeIndex];

  return (
    <section className="showcase-shell">
      <div className="showcase-hero">
        <div className="showcase-kicker-row">
          <span className="showcase-kicker">Próximos jogos</span>
          <span className="showcase-badge">
            {activeIndex + 1}/{matches.length}
          </span>
        </div>
        <h2>{tournamentName}</h2>
        <p>
          {stageTitle} • {stageDescription}
        </p>
      </div>

      <div className="showcase-stage">
        <div className="showcase-stage-head">
          <div>
            <span className="showcase-stage-label">{activeMatch.stageLabel}</span>
            <h3>{activeMatch.label}</h3>
          </div>
          <span className="showcase-order">{activeMatch.orderLabel}</span>
        </div>

        <div className="showcase-versus">
          <article className="showcase-team-card">
            <span className="showcase-team-caption">Dupla 1</span>
            <strong>{activeMatch.homePairName ?? "A definir"}</strong>
          </article>

          <div className="showcase-versus-badge">VS</div>

          <article className="showcase-team-card">
            <span className="showcase-team-caption">Dupla 2</span>
            <strong>{activeMatch.awayPairName ?? "A definir"}</strong>
          </article>
        </div>

        <div className="showcase-meta-grid">
          <div className="showcase-meta-card">
            <span>Contexto</span>
            <strong>{activeMatch.groupName ?? activeMatch.stageLabel}</strong>
          </div>
          <div className="showcase-meta-card">
            <span>Quadra</span>
            <strong>{activeMatch.courtName ?? "A definir"}</strong>
          </div>
        </div>

        <div className="showcase-controls">
          <button
            type="button"
            className="button"
            onClick={() => setActiveIndex((current) => (current - 1 + matches.length) % matches.length)}
          >
            Anterior
          </button>
          <div className="showcase-dots" aria-label="Slides dos próximos jogos">
            {matches.map((match, index) => (
              <button
                key={match.id}
                type="button"
                className={`showcase-dot${index === activeIndex ? " showcase-dot-active" : ""}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Abrir slide ${index + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            className="button button-primary"
            onClick={() => setActiveIndex((current) => (current + 1) % matches.length)}
          >
            Próximo
          </button>
        </div>
      </div>

      <div className="showcase-filmstrip" aria-label="Fila de próximos jogos">
        {matches.map((match, index) => (
          <button
            key={`${match.id}-thumb`}
            type="button"
            className={`showcase-thumb${index === activeIndex ? " showcase-thumb-active" : ""}`}
            onClick={() => setActiveIndex(index)}
          >
            <span>{match.stageLabel}</span>
            <strong>{match.homePairName ?? "A definir"} x {match.awayPairName ?? "A definir"}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
