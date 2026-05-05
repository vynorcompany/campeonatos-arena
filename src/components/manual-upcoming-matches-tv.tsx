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
  status: string;
};

type TvPresentationSettings = {
  slideIntervalSeconds: number;
  selectedTournamentId: string;
  selectedTournamentName: string;
  showMatches: boolean;
  showSponsors: boolean;
  showRanking: boolean;
  showMonthlyPrize: boolean;
  showNightWinner: boolean;
  monthlyPrizeTitle: string;
  monthlyPrizeAmount: string;
  monthlyPrizeDescription: string;
  nightWinnerTitle: string;
  nightWinnerName: string;
  nightWinnerDescription: string;
};

type TvSponsor = {
  id: string;
  name: string;
  subtitle: string;
  logoUrl: string;
  displayOrder: number;
};

type TvRankingEntry = {
  id: string;
  name: string;
  points: number;
};

type ManualUpcomingMatchesTvProps = {
  arenaName: string;
  arenaLogoUrl: string;
  matches: ManualUpcomingMatch[];
  settings: TvPresentationSettings;
  sponsors: TvSponsor[];
  ranking: TvRankingEntry[];
};

type TvPresentationResponse = {
  matches: ManualUpcomingMatch[];
  settings: TvPresentationSettings;
  sponsors: TvSponsor[];
  ranking: TvRankingEntry[];
};

type SlideItem =
  | { id: string; title: string; type: "matches" }
  | { id: string; title: string; type: "ranking" }
  | { id: string; title: string; type: "monthlyPrize" }
  | { id: string; title: string; type: "nightWinner" }
  | { id: string; title: string; type: "sponsor"; sponsorId: string };

const visibleMatchCount = 6;

function normalize(value: string, fallback: string) {
  return value.trim() || fallback;
}

function getDisplayNumber(activeIndex: number, visibleIndex: number, total: number) {
  const number = activeIndex + visibleIndex + 1;
  return number > total ? number - total : number;
}

function getMatchStatusLabel(status: string) {
  if (status === "LIVE") return "Em andamento";
  if (status === "FINISHED") return "Encerrado";
  return "Agendado";
}

function getPrizeItems(amount: string, description: string) {
  return [amount, ...description.split("|")]
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ManualUpcomingMatchesTv({
  arenaName,
  arenaLogoUrl,
  matches,
  settings,
  sponsors,
  ranking
}: ManualUpcomingMatchesTvProps) {
  const [liveMatches, setLiveMatches] = useState(matches);
  const [liveSettings, setLiveSettings] = useState(settings);
  const [liveSponsors, setLiveSponsors] = useState(sponsors);
  const [liveRanking, setLiveRanking] = useState(ranking);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
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

  const slides = useMemo(() => {
    const nextSlides: SlideItem[] = [];

    if (liveSettings.showMatches && liveMatches.length) {
      nextSlides.push({ id: "matches", title: "Próximos jogos", type: "matches" });
    }

    if (liveSettings.showSponsors && liveSponsors.length) {
      for (const sponsor of liveSponsors) {
        nextSlides.push({
          id: `sponsor-${sponsor.id}`,
          title: sponsor.subtitle.trim() || "Patrocinador",
          type: "sponsor",
          sponsorId: sponsor.id
        });
      }
    }

    if (liveSettings.showRanking && liveRanking.length) {
      nextSlides.push({
        id: "ranking",
        title: liveSettings.selectedTournamentName ? `Ranking - ${liveSettings.selectedTournamentName}` : "Ranking",
        type: "ranking"
      });
    }

    if (
      liveSettings.showMonthlyPrize &&
      (liveSettings.monthlyPrizeAmount.trim() || liveSettings.monthlyPrizeDescription.trim() || liveSettings.monthlyPrizeTitle.trim())
    ) {
      nextSlides.push({ id: "monthlyPrize", title: "Premiação mensal", type: "monthlyPrize" });
    }

    if (
      liveSettings.showNightWinner &&
      (liveSettings.nightWinnerName.trim() || liveSettings.nightWinnerDescription.trim() || liveSettings.nightWinnerTitle.trim())
    ) {
      nextSlides.push({ id: "nightWinner", title: "Vencedor da noite", type: "nightWinner" });
    }

    return nextSlides;
  }, [liveMatches.length, liveRanking, liveSettings, liveSponsors]);

  const activeSlide = slides[activeSlideIndex] ?? slides[0] ?? null;
  const activeSponsor = activeSlide?.type === "sponsor" ? liveSponsors.find((item) => item.id === activeSlide.sponsorId) ?? null : null;
  const monthlyPrizeItems = getPrizeItems(liveSettings.monthlyPrizeAmount, liveSettings.monthlyPrizeDescription);
  const slideIntervalMs = Math.max(5, liveSettings.slideIntervalSeconds || 12) * 1000;

  useEffect(() => {
    setLiveMatches(matches);
    setLiveSettings(settings);
    setLiveSponsors(sponsors);
    setLiveRanking(ranking);
  }, [matches, ranking, settings, sponsors]);

  useEffect(() => {
    setActiveIndex(0);
  }, [liveMatches.length]);

  useEffect(() => {
    setActiveSlideIndex(0);
  }, [slides.length]);

  useEffect(() => {
    let isCurrent = true;

    async function refreshPresentation() {
      try {
        const response = await fetch("/api/manual-upcoming-matches", {
          cache: "no-store"
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as TvPresentationResponse;
        if (isCurrent) {
          setLiveMatches(data.matches);
          setLiveSettings(data.settings);
          setLiveSponsors(data.sponsors);
          setLiveRanking(data.ranking);
        }
      } catch {
        // Keep the last known TV presentation if the network blips.
      }
    }

    const timer = window.setInterval(refreshPresentation, 4000);
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

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveSlideIndex((current) => (current + 1) % slides.length);
    }, slideIntervalMs);

    return () => window.clearInterval(timer);
  }, [slideIntervalMs, slides.length]);

  if (!activeSlide) {
    return (
      <main className="tv-stage tv-stage-empty">
        <div className="tv-shell">
          <p className="tv-kicker">Tela da TV</p>
          <Image src={arenaLogoUrl || "/arena-profile.jpg"} alt={arenaName} width={160} height={160} className="tv-arena-logo tv-arena-logo-empty" priority />
          <p className="tv-empty-copy">Nenhum conteúdo selecionado para a TV no momento.</p>
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
          <h1 className="tv-title">{activeSlide.title}</h1>
          <div className="tv-counter">
            <span>{activeSlideIndex + 1}</span>
            <small>de {slides.length}</small>
          </div>
        </header>

        <div className="tv-slide-frame" key={activeSlide.id}>
          {activeSlide.type === "matches" ? (
            <div className="tv-matches-grid">
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
                      <span className={`tv-match-status tv-match-status-${match.status.toLowerCase()}`}>
                        {getMatchStatusLabel(match.status)}
                      </span>
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
                    <span className="tv-match-status">Aguardando</span>
                  </div>
                  <div className="tv-scoreboard">
                    <div className="tv-score-row">
                      <strong className="tv-team-name">Aguardando cadastro</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {activeSlide.type === "sponsor" && activeSponsor ? (
            <div className="tv-sponsor-stage">
              <div className="tv-sponsor-panel">
                <h2 className="tv-sponsor-section-title">PATROCINADORES</h2>
                <p className="tv-info-kicker">{activeSponsor.subtitle.trim() || "Patrocinador"}</p>
                <div className="tv-sponsor-logo-frame">
                  {activeSponsor.logoUrl ? (
                    <img src={activeSponsor.logoUrl} alt={`Logo de ${activeSponsor.name}`} className="tv-sponsor-logo" />
                  ) : (
                    <strong className="tv-sponsor-fallback">{activeSponsor.name}</strong>
                  )}
                </div>
                {activeSponsor.logoUrl ? <span className="tv-sponsor-name">{activeSponsor.name}</span> : null}
              </div>
            </div>
          ) : null}

          {activeSlide.type === "ranking" ? (
            <div className="tv-ranking-board">
              {liveRanking.map((player, index) => (
                <article className="tv-ranking-card" key={player.id}>
                  <span className="tv-ranking-position">#{index + 1}</span>
                  <strong>{player.name}</strong>
                  <small>{player.points} pts</small>
                </article>
              ))}
            </div>
          ) : null}

          {activeSlide.type === "monthlyPrize" ? (
            <div className="tv-spotlight-card tv-prize-card">
              <p className="tv-info-kicker">Campanha do mês</p>
              <h2>{normalize(liveSettings.monthlyPrizeTitle, "Premiação mensal")}</h2>
              <div className="tv-prize-cascade">
                {monthlyPrizeItems.map((item, index) => (
                  <article className={`tv-prize-tier tv-prize-tier-${index + 1}`} key={`${item}-${index}`}>
                    <span className="tv-prize-tier-order">{index + 1}º</span>
                    <strong>{item}</strong>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {activeSlide.type === "nightWinner" ? (
            <div className="tv-spotlight-card tv-spotlight-card-winner">
              <p className="tv-info-kicker">Resultado da noite</p>
              <h2>{normalize(liveSettings.nightWinnerTitle, "Vencedor da noite")}</h2>
              {liveSettings.nightWinnerName.trim() ? <strong>{liveSettings.nightWinnerName}</strong> : null}
              {liveSettings.nightWinnerDescription.trim() ? <p>{liveSettings.nightWinnerDescription}</p> : null}
            </div>
          ) : null}
        </div>

        {slides.length > 1 ? <div className="tv-progress" style={{ animationDuration: `${slideIntervalMs}ms` }} /> : null}
      </section>
    </main>
  );
}
