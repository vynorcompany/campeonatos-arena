"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type ManualUpcomingMatch = {
  id: string;
  displayOrder: number;
  homePairName: string;
  awayPairName: string;
  courtName: string;
  scheduledTime: string;
};

type ManualUpcomingMatchesTvProps = {
  arenaName: string;
  matches: ManualUpcomingMatch[];
};

function normalize(value: string, fallback: string) {
  return value.trim() || fallback;
}

function getDisplayNumber(activeIndex: number, visibleIndex: number, total: number) {
  const number = activeIndex + visibleIndex + 1;
  return number > total ? number - total : number;
}

export function ManualUpcomingMatchesTv({ arenaName, matches }: ManualUpcomingMatchesTvProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasOverflowMatches = matches.length > 3;

  const visibleMatches = useMemo(() => {
    if (!matches.length) {
      return [];
    }

    if (matches.length <= 3) {
      return matches;
    }

    return [...matches.slice(activeIndex), ...matches.slice(0, activeIndex)].slice(0, 3);
  }, [activeIndex, matches]);

  useEffect(() => {
    setActiveIndex(0);
  }, [matches.length]);

  useEffect(() => {
    if (!hasOverflowMatches) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % matches.length);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [hasOverflowMatches, matches.length]);

  if (!matches.length) {
    return (
      <main className="tv-stage tv-stage-empty">
        <div className="tv-shell">
          <p className="tv-kicker">Pr&oacute;ximos jogos</p>
          <Image src="/arena-profile.jpg" alt={arenaName} width={160} height={160} className="tv-arena-logo tv-arena-logo-empty" priority />
          <p className="tv-empty-copy">Nenhum jogo cadastrado no momento.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="tv-stage">
      <section className="tv-shell">
        <header className="tv-header">
          <div className="tv-brand">
            <Image src="/arena-profile.jpg" alt={arenaName} width={140} height={140} className="tv-arena-logo" priority />
          </div>
          <h1 className="tv-title">Pr&oacute;ximos jogos</h1>
          <div className="tv-counter">
            <span>{Math.min(visibleMatches.length, 3)}</span>
            <small>de {matches.length}</small>
          </div>
        </header>

        <div className="tv-matches-grid" key={visibleMatches.map((match) => match.id).join("-")}>
          {visibleMatches.map((match, index) => (
            <article className="tv-match-card" key={match.id}>
              <div className="tv-match-time">{normalize(match.scheduledTime, "Hor&aacute;rio a definir")}</div>
              <div className="tv-scoreboard">
                <div className="tv-match-topline">Jogo {getDisplayNumber(activeIndex, index, matches.length)}</div>
                <div className="tv-score-row">
                  <span className="tv-team-side tv-team-side-home" />
                  <strong className="tv-team-name">{normalize(match.homePairName, "Dupla 1")}</strong>
                  <span className="tv-vs-line">v</span>
                  <span className="tv-team-side tv-team-side-away" />
                  <strong className="tv-team-name">{normalize(match.awayPairName, "Dupla 2")}</strong>
                </div>
              </div>
              <div className="tv-court-name">{normalize(match.courtName, "Quadra a definir")}</div>
            </article>
          ))}

          {Array.from({ length: Math.max(0, 3 - visibleMatches.length) }).map((_, index) => (
            <article className="tv-match-card tv-empty-slot" key={`empty-${index}`}>
              <div className="tv-match-time">--:--</div>
              <div className="tv-scoreboard">
                <div className="tv-match-topline">Em aberto</div>
                <div className="tv-score-row">
                  <strong className="tv-team-name">Aguardando cadastro</strong>
                </div>
              </div>
              <div className="tv-court-name">Quadra</div>
            </article>
          ))}
        </div>

        <footer className="tv-footer">
          <span>Atualiza&ccedil;&atilde;o autom&aacute;tica da fila</span>
          {hasOverflowMatches ? <span>Pr&oacute;xima troca em instantes</span> : null}
        </footer>

        {hasOverflowMatches ? <div className="tv-progress" /> : null}
      </section>
    </main>
  );
}
