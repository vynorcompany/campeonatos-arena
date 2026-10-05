"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./manual-upcoming-matches-tv.utilities";

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
  tvMatchSource: "MANUAL" | "TOURNAMENT";
  selectedRankingIds: string[];
  selectedSponsorIds: string[];
  selectedTournamentName: string;
  showMatches: boolean;
  showCalendar: boolean;
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

type TvRankingSlide = {
  id: string;
  title: string;
  entries: TvRankingEntry[];
};

type TvCalendarEntry = {
  id: string;
  title: string;
  meta: string;
  dateLabel: string;
  timeLabel: string;
  typeLabel: string;
};

type TvCalendarPayload = {
  rangeLabel: string;
  items: TvCalendarEntry[];
};

type ManualUpcomingMatchesTvProps = {
  arenaName: string;
  arenaLogoUrl: string;
  matches: ManualUpcomingMatch[];
  settings: TvPresentationSettings;
  sponsors: TvSponsor[];
  ranking: TvRankingEntry[];
  rankingSlides: TvRankingSlide[];
  calendar: TvCalendarPayload;
};

type TvPresentationResponse = {
  matches: ManualUpcomingMatch[];
  settings: TvPresentationSettings;
  sponsors: TvSponsor[];
  ranking: TvRankingEntry[];
  rankingSlides: TvRankingSlide[];
  calendar: TvCalendarPayload;
};

type SlideItem =
  | { id: string; title: string; type: "matches" }
  | { id: string; title: string; type: "calendar" }
  | { id: string; title: string; type: "ranking"; rankingKey: string }
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
  ranking,
  rankingSlides,
  calendar
}: ManualUpcomingMatchesTvProps) {
  const [liveMatches, setLiveMatches] = useState(matches);
  const [liveSettings, setLiveSettings] = useState(settings);
  const [liveSponsors, setLiveSponsors] = useState(sponsors);
  const [liveRanking, setLiveRanking] = useState(ranking);
  const [liveRankingSlides, setLiveRankingSlides] = useState(rankingSlides);
  const [liveCalendar, setLiveCalendar] = useState(calendar);
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

    if (liveSettings.showCalendar && liveCalendar.items.length) {
      nextSlides.push({ id: "calendar", title: "Calendário da arena", type: "calendar" });
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
        id: "ranking-default",
        title: liveSettings.selectedTournamentName ? `Ranking - ${liveSettings.selectedTournamentName}` : "Ranking",
        type: "ranking",
        rankingKey: "default"
      });
    }

    if (liveSettings.showRanking && liveRankingSlides.length) {
      for (const rankingSlide of liveRankingSlides) {
        nextSlides.push({
          id: `ranking-profile-${rankingSlide.id}`,
          title: `Ranking - ${rankingSlide.title}`,
          type: "ranking",
          rankingKey: rankingSlide.id
        });
      }
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
  }, [liveCalendar.items.length, liveMatches.length, liveRanking, liveRankingSlides, liveSettings, liveSponsors]);

  const activeSlide = slides[activeSlideIndex] ?? slides[0] ?? null;
  const activeSponsor = activeSlide?.type === "sponsor" ? liveSponsors.find((item) => item.id === activeSlide.sponsorId) ?? null : null;
  const activeRankingEntries =
    activeSlide?.type === "ranking"
      ? activeSlide.rankingKey === "default"
        ? liveRanking
        : liveRankingSlides.find((item) => item.id === activeSlide.rankingKey)?.entries ?? []
      : [];
  const monthlyPrizeItems = getPrizeItems(liveSettings.monthlyPrizeAmount, liveSettings.monthlyPrizeDescription);
  const slideIntervalMs = Math.max(5, liveSettings.slideIntervalSeconds || 12) * 1000;

  useEffect(() => {
    setLiveMatches(matches);
    setLiveSettings(settings);
    setLiveSponsors(sponsors);
    setLiveRanking(ranking);
    setLiveRankingSlides(rankingSlides);
    setLiveCalendar(calendar);
  }, [calendar, matches, ranking, rankingSlides, settings, sponsors]);

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
          setLiveRankingSlides(data.rankingSlides);
          setLiveCalendar(data.calendar);
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
      <main className={viewStyles.tv_stage_tv_stage_empty}>
        <div className={viewStyles.tv_shell}>
          <p className={viewStyles.tv_kicker}>Tela da TV</p>
          <Image src={arenaLogoUrl || "/arena-profile.jpg"} alt={arenaName} width={160} height={160} className={viewStyles.tv_arena_logo_tv_arena_logo_empty} priority />
          <p className={viewStyles.tv_empty_copy}>Nenhum conteúdo selecionado para a TV no momento.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={viewStyles.tv_stage}>
      <section className={viewStyles.tv_shell}>
        <header className={viewStyles.tv_header}>
          <div className={viewStyles.tv_brand}>
            <Image src={arenaLogoUrl || "/arena-profile.jpg"} alt={arenaName} width={140} height={140} className={viewStyles.tv_arena_logo} priority />
            <div className={viewStyles.tv_brand_copy}><span>ARENA PADEL</span><strong>{arenaName}</strong></div>
          </div>
          <h1 className={viewStyles.tv_title}>{activeSlide.title}</h1>
          <div className={viewStyles.tv_counter}>
            <span>{activeSlideIndex + 1}</span>
            <small>de {slides.length}</small>
          </div>
        </header>

        <div className={viewStyles.tv_slide_frame} key={activeSlide.id}>
          {activeSlide.type === "matches" ? (
            <div className={cx(`${viewStyles.tv_matches_grid} tv-matches-count-${Math.min(visibleMatches.length, visibleMatchCount)}`)}>
              {visibleMatches.map((match, index) => {
                const scheduledTime = match.scheduledTime.trim();
                const displayNumber = getDisplayNumber(activeIndex, index, liveMatches.length);

                return (
                  <article className={viewStyles.tv_match_card} key={match.id}>
                    <div className={viewStyles.tv_match_meta}>
                      <div className={viewStyles.tv_match_topline}>
                        <span>Jogo {displayNumber}</span>
                        {scheduledTime ? (
                          <>
                            <span className={viewStyles.tv_match_separator}>-</span>
                            <strong className={viewStyles.tv_match_time}>{scheduledTime}</strong>
                          </>
                        ) : null}
                        <span className={viewStyles.tv_match_separator}>-</span>
                        <span className={viewStyles.tv_court_name}>{normalize(match.courtName, "Quadra a definir")}</span>
                      </div>
                      <span className={cx(`${viewStyles.tv_match_status} tv-match-status-${match.status.toLowerCase()}`)}>
                        {getMatchStatusLabel(match.status)}
                      </span>
                    </div>
                    <div className={viewStyles.tv_scoreboard}>
                      <div className={viewStyles.tv_score_row}>
                        <span className={viewStyles.tv_team_side_tv_team_side_home} />
                        <strong className={viewStyles.tv_team_name}>{normalize(match.homePairName, "Dupla 1")}</strong>
                        <span className={viewStyles.tv_vs_line}>v</span>
                        <span className={viewStyles.tv_team_side_tv_team_side_away} />
                        <strong className={viewStyles.tv_team_name}>{normalize(match.awayPairName, "Dupla 2")}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}

            </div>
          ) : null}

          {activeSlide.type === "calendar" ? (
            <div className={viewStyles.tv_calendar_stage}>
              <div className={viewStyles.tv_calendar_head}>
                <p className={viewStyles.tv_info_kicker}>Agenda da arena</p>
                <strong>{liveCalendar.rangeLabel}</strong>
              </div>
              <div className={viewStyles.tv_calendar_list}>
                {liveCalendar.items.map((item) => (
                  <article className={viewStyles.tv_calendar_card} key={item.id}>
                    <div className={viewStyles.tv_calendar_date}>
                      <span>{item.dateLabel}</span>
                      <strong>{item.timeLabel}</strong>
                    </div>
                    <div className={viewStyles.tv_calendar_copy}>
                      <small>{item.typeLabel}</small>
                      <strong>{item.title}</strong>
                      <span>{item.meta}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {activeSlide.type === "sponsor" && activeSponsor ? (
            <div className={viewStyles.tv_sponsor_stage}>
              <div className={viewStyles.tv_sponsor_panel}>
                <h2 className={viewStyles.tv_sponsor_section_title}>PATROCINADORES</h2>
                <p className={viewStyles.tv_info_kicker}>{activeSponsor.subtitle.trim() || "Patrocinador"}</p>
                <div className={viewStyles.tv_sponsor_logo_frame}>
                  {activeSponsor.logoUrl ? (
                    <img src={activeSponsor.logoUrl} alt={`Logo de ${activeSponsor.name}`} className={viewStyles.tv_sponsor_logo} />
                  ) : (
                    <strong className={viewStyles.tv_sponsor_fallback}>{activeSponsor.name}</strong>
                  )}
                </div>
                {activeSponsor.logoUrl ? <span className={viewStyles.tv_sponsor_name}>{activeSponsor.name}</span> : null}
              </div>
            </div>
          ) : null}

          {activeSlide.type === "ranking" ? (
            <div className={viewStyles.tv_ranking_board}>
              {activeRankingEntries.map((player, index) => (
                <article className={viewStyles.tv_ranking_card} key={player.id}>
                  <span className={viewStyles.tv_ranking_position}>#{index + 1}</span>
                  <strong>{player.name}</strong>
                  <small>{player.points} pts</small>
                </article>
              ))}
            </div>
          ) : null}

          {activeSlide.type === "monthlyPrize" ? (
            <div className={viewStyles.tv_spotlight_card_tv_prize_card}>
              <p className={viewStyles.tv_info_kicker}>Campanha do mês</p>
              <h2>{normalize(liveSettings.monthlyPrizeTitle, "Premiação mensal")}</h2>
              <div className={viewStyles.tv_prize_cascade}>
                {monthlyPrizeItems.map((item, index) => (
                  <article className={cx(`${viewStyles.tv_prize_tier} tv-prize-tier-${index + 1}`)} key={`${item}-${index}`}>
                    <span className={viewStyles.tv_prize_tier_order}>{index + 1}º</span>
                    <strong>{item}</strong>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {activeSlide.type === "nightWinner" ? (
            <div className={viewStyles.tv_spotlight_card_tv_spotlight_card_winner}>
              <p className={viewStyles.tv_info_kicker}>Resultado da noite</p>
              <h2>{normalize(liveSettings.nightWinnerTitle, "Vencedor da noite")}</h2>
              {liveSettings.nightWinnerName.trim() ? <strong>{liveSettings.nightWinnerName}</strong> : null}
              {liveSettings.nightWinnerDescription.trim() ? <p>{liveSettings.nightWinnerDescription}</p> : null}
            </div>
          ) : null}
        </div>

        {slides.length > 1 ? <div className={viewStyles.tv_progress} style={{ animationDuration: `${slideIntervalMs}ms` }} /> : null}
      </section>
    </main>
  );
}
