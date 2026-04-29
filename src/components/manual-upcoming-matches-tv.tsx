"use client";

import { useEffect, useMemo, useState } from "react";

type ManualUpcomingMatch = {
  id: string;
  displayOrder: number;
  homePairName: string;
  awayPairName: string;
  courtName: string;
};

type ManualUpcomingMatchesTvProps = {
  arenaName: string;
  matches: ManualUpcomingMatch[];
};

function normalize(value: string, fallback: string) {
  return value.trim() || fallback;
}

export function ManualUpcomingMatchesTv({ arenaName, matches }: ManualUpcomingMatchesTvProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeMatch = matches[activeIndex];
  const hasMultipleMatches = matches.length > 1;

  const nextMatches = useMemo(() => {
    if (!matches.length) {
      return [];
    }

    return matches.filter((_, index) => index !== activeIndex).slice(0, 4);
  }, [activeIndex, matches]);

  useEffect(() => {
    setActiveIndex(0);
  }, [matches.length]);

  useEffect(() => {
    if (!hasMultipleMatches) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % matches.length);
    }, 9000);

    return () => window.clearInterval(timer);
  }, [hasMultipleMatches, matches.length]);

  if (!activeMatch) {
    return (
      <main className="tv-stage tv-stage-empty">
        <div className="tv-shell">
          <p className="tv-kicker">Próximos jogos</p>
          <h1>{arenaName}</h1>
          <p className="tv-empty-copy">Nenhum jogo cadastrado no momento.</p>
        </div>
      </main>
    );
  }

  const homePairName = normalize(activeMatch.homePairName, "DUPLA 1");
  const awayPairName = normalize(activeMatch.awayPairName, "DUPLA 2");
  const courtName = normalize(activeMatch.courtName, "QUADRA A DEFINIR");

  return (
    <main className="tv-stage">
      <section className="tv-shell" key={activeMatch.id}>
        <header className="tv-header">
          <div>
            <p className="tv-kicker">Próximos jogos</p>
            <h1>{arenaName}</h1>
          </div>
          <div className="tv-counter">
            <span>{activeIndex + 1}</span>
            <small>/ {matches.length}</small>
          </div>
        </header>

        <div className="tv-match-card">
          <div className="tv-court-pill">{courtName}</div>

          <div className="tv-versus-grid">
            <article className="tv-team">
              <span>Dupla 1</span>
              <strong>{homePairName}</strong>
            </article>

            <div className="tv-versus">VS</div>

            <article className="tv-team">
              <span>Dupla 2</span>
              <strong>{awayPairName}</strong>
            </article>
          </div>
        </div>

        {nextMatches.length ? (
          <aside className="tv-queue" aria-label="Fila de jogos seguintes">
            <p>Na sequência</p>
            <div className="tv-queue-list">
              {nextMatches.map((match) => (
                <div className="tv-queue-item" key={match.id}>
                  <span>{normalize(match.courtName, "Quadra a definir")}</span>
                  <strong>
                    {normalize(match.homePairName, "Dupla 1")} x {normalize(match.awayPairName, "Dupla 2")}
                  </strong>
                </div>
              ))}
            </div>
          </aside>
        ) : null}

        {hasMultipleMatches ? <div className="tv-progress" /> : null}
      </section>
    </main>
  );
}
