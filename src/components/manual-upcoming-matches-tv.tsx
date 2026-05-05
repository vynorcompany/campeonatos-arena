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
  arenaLogoUrl: string;
  matches: ManualUpcomingMatch[];
};

type ManualUpcomingMatchesResponse = {
  matches: ManualUpcomingMatch[];
};

const visibleMatchCount = 6;

function normalize(value: string, fallback: string) {
  return value.trim() || fallback;
}

function getDisplayNumber(activeIndex: number, visibleIndex: number, total: number) {
  const number = activeIndex + visibleIndex + 1;
  return number > total ? number - total : number;
}

export function ManualUpcomingMatchesTv({ arenaName, arenaLogoUrl, matches }: ManualUpcomingMatchesTvProps) {
  const [liveMatches, setLiveMatches] = useState(matches);
  const [activeIndex, setActiveIndex] = useState(0);
  const hasOverflowMatches = liveMatches.length > visibleMatchCount;

  const visibleMatches = useMemo(() => {
    if (!liveMatches.length) {
      return [];
    }

    if (liveMatches.length <= visibleMatchCount) {
      return liveMatches;
    }

    return [...liveMatches.slice(activeIndex), ...liveMatches.slice(0, activeIndex)].slice(0, visibleMatchCount);
  }, [activeIndex, liveMatches]);

  useEffect(() => {
    setLiveMatches(matches);
  }, [matches]);

  useEffect(() => {
    setActiveIndex(0);
  }, [liveMatches.length]);

  useEffect(() => {
    let isCurrent = true;

    async function refreshMatches() {
      try {
        const response = await fetch("/api/manual-upcoming-matches", {
          cache: "no-store"
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as ManualUpcomingMatchesResponse;
        if (isCurrent) {
          setLiveMatches(data.matches);
        }
      } catch {
        // Keep the last known TV schedule if the network blips.
      }
    }

    const timer = window.setInterval(refreshMatches, 4000);
    return () => {
      isCurrent = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!hasOverflowMatches) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % liveMatches.length);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [hasOverflowMatches, liveMatches.length]);

  if (!liveMatches.length) {
    return (
      <main className="tv-stage tv-stage-empty">
        <div className="tv-shell">
          <p className="tv-kicker">Pr&oacute;ximos jogos</p>
          <Image src={arenaLogoUrl || "/arena-profile.jpg"} alt={arenaName} width={160} height={160} className="tv-arena-logo tv-arena-logo-empty" priority />
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
            <Image src={arenaLogoUrl || "/arena-profile.jpg"} alt={arenaName} width={140} height={140} className="tv-arena-logo" priority />
          </div>
          <h1 className="tv-title">Pr&oacute;ximos jogos</h1>
          <div className="tv-counter">
            <span>{Math.min(visibleMatches.length, visibleMatchCount)}</span>
            <small>de {liveMatches.length}</small>
          </div>
        </header>

        <div className="tv-matches-grid" key={visibleMatches.map((match) => match.id).join("-")}>
          {visibleMatches.map((match, index) => {
            const scheduledTime = match.scheduledTime.trim();
            const displayNumber = getDisplayNumber(activeIndex, index, liveMatches.length);

            return (
              <article className="tv-match-card" key={match.id}>
                <div className="tv-match-meta">
                  <div className="tv-match-topline">
                    <span>Jogo {displayNumber}</span>
                    {scheduledTime ? (
                      <>
                        <span className="tv-match-separator">-</span>
                        <strong className="tv-match-time">{scheduledTime}</strong>
                      </>
                    ) : null}
                    <span className="tv-match-separator">-</span>
                    <span className="tv-court-name">{normalize(match.courtName, "Quadra a definir")}</span>
                  </div>
                </div>
                <div className="tv-scoreboard">
                  <div className="tv-score-row">
                    <span className="tv-team-side tv-team-side-home" />
                    <strong className="tv-team-name">{normalize(match.homePairName, "Dupla 1")}</strong>
                    <span className="tv-vs-line">v</span>
                    <span className="tv-team-side tv-team-side-away" />
                    <strong className="tv-team-name">{normalize(match.awayPairName, "Dupla 2")}</strong>
                  </div>
                </div>
              </article>
            );
          })}

          {Array.from({ length: Math.max(0, visibleMatchCount - visibleMatches.length) }).map((_, index) => (
            <article className="tv-match-card tv-empty-slot" key={`empty-${index}`}>
              <div className="tv-match-meta">
                <div className="tv-match-topline">
                  <span>Em aberto</span>
                  <span className="tv-match-separator">-</span>
                  <span className="tv-court-name">Quadra</span>
                </div>
              </div>
              <div className="tv-scoreboard">
                <div className="tv-score-row">
                  <strong className="tv-team-name">Aguardando cadastro</strong>
                </div>
              </div>
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
