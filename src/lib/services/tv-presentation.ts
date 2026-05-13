import { prisma } from "@/lib/prisma";
import { isPrismaSchemaOutdatedError, isPrismaUnknownFieldError } from "@/lib/prisma-errors";

type TvSettingsPayload = {
  slideIntervalSeconds: number;
  selectedTournamentId: string | null;
  tvMatchSource: "MANUAL" | "TOURNAMENT";
  selectedRankingIds: string[];
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
} | null;

type TvSponsorPayload = {
  id: string;
  name: string;
  subtitle: string;
  logoUrl: string;
  displayOrder: number;
};

type TvCalendarEntry = {
  id: string;
  title: string;
  meta: string;
  dateLabel: string;
  timeLabel: string;
  typeLabel: string;
};

type TvRankingSlide = {
  id: string;
  title: string;
  entries: Array<{
    id: string;
    name: string;
    points: number;
  }>;
};

function normalizeTvMatchSource(value: unknown): "MANUAL" | "TOURNAMENT" {
  return value === "TOURNAMENT" ? "TOURNAMENT" : "MANUAL";
}

function formatCalendarDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).format(value);
}

function formatCalendarTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

export async function getManualUpcomingMatchesPayload(arenaId: string) {
  try {
    return await prisma.manualUpcomingMatch.findMany({
      where: { arenaId },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        displayOrder: true,
        homePairName: true,
        awayPairName: true,
        courtName: true,
        scheduledTime: true,
        status: true
      }
    });
  } catch (error) {
    if (!isPrismaSchemaOutdatedError(error)) {
      throw error;
    }

    const legacyMatches = await prisma.manualUpcomingMatch.findMany({
      where: { arenaId },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        displayOrder: true,
        homePairName: true,
        awayPairName: true,
        courtName: true,
        scheduledTime: true
      }
    });

    return legacyMatches.map((match) => ({
      ...match,
      status: "SCHEDULED"
    }));
  }
}

function getMatchDisplayStatus(match: { winnerPairId: string | null; manualStatus: string | null; homeScore: number | null; awayScore: number | null }) {
  if (match.winnerPairId) return "FINISHED";
  if (match.manualStatus === "WAITING") return "SCHEDULED";
  if (match.manualStatus === "LIVE" || match.manualStatus === "FINISHED") return match.manualStatus;
  if (match.homeScore !== null || match.awayScore !== null) return "LIVE";
  return "SCHEDULED";
}

function parseTimeToMinutes(value: string | null | undefined) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.MAX_SAFE_INTEGER;
  return h * 60 + m;
}

async function getTournamentUpcomingMatchesPayload(arenaId: string) {
  let matches: Array<{
    id: string;
    winnerPairId: string | null;
    homeScore: number | null;
    awayScore: number | null;
    manualStatus: string | null;
    courtName: string | null;
    scheduledTime: string | null;
    homePair: { name: string } | null;
    awayPair: { name: string } | null;
  }>;

  try {
    matches = await prisma.match.findMany({
      where: {
        tournament: {
          arenaId,
          status: {
            not: "FINISHED"
          }
        },
        showOnTv: true,
        homePairId: {
          not: null
        },
        awayPairId: {
          not: null
        }
      },
      include: {
        homePair: {
          select: {
            name: true
          }
        },
        awayPair: {
          select: {
            name: true
          }
        }
      },
      orderBy: [{ roundOrder: "asc" }, { updatedAt: "asc" }]
    });
  } catch (error) {
    if (!isPrismaUnknownFieldError(error, "manualStatus") && !isPrismaUnknownFieldError(error, "showOnTv")) {
      throw error;
    }

    const legacyMatches = await prisma.match.findMany({
      where: {
        tournament: {
          arenaId,
          status: {
            not: "FINISHED"
          }
        },
        homePairId: {
          not: null
        },
        awayPairId: {
          not: null
        }
      },
      include: {
        homePair: {
          select: {
            name: true
          }
        },
        awayPair: {
          select: {
            name: true
          }
        }
      },
      orderBy: [{ roundOrder: "asc" }, { updatedAt: "asc" }]
    });

    matches = legacyMatches.map((match) => ({
      ...match,
      manualStatus: null
    }));
  }

  return matches
    .sort((a, b) => parseTimeToMinutes(a.scheduledTime) - parseTimeToMinutes(b.scheduledTime))
    .slice(0, 8)
    .map((match, index) => ({
      id: `match-${match.id}`,
      displayOrder: index + 1,
      homePairName: match.homePair?.name ?? "",
      awayPairName: match.awayPair?.name ?? "",
      courtName: match.courtName ?? "",
      scheduledTime: match.scheduledTime ?? "",
      status: getMatchDisplayStatus(match)
    }));
}

async function getTvSettings(arenaId: string) {
  try {
    const settings = await prisma.tvPresentationSettings.findUnique({
      where: { arenaId },
      select: {
        slideIntervalSeconds: true,
        selectedTournamentId: true,
        tvMatchSource: true,
        selectedRankingIds: true,
        showMatches: true,
        showCalendar: true,
        showSponsors: true,
        showRanking: true,
        showMonthlyPrize: true,
        showNightWinner: true,
        monthlyPrizeTitle: true,
        monthlyPrizeAmount: true,
        monthlyPrizeDescription: true,
        nightWinnerTitle: true,
        nightWinnerName: true,
        nightWinnerDescription: true
      }
    });

    if (!settings) {
      return null;
    }

    return {
      ...settings,
      tvMatchSource: normalizeTvMatchSource(settings.tvMatchSource)
    } satisfies TvSettingsPayload;
  } catch (error) {
    if (!isPrismaSchemaOutdatedError(error) && !isPrismaUnknownFieldError(error, "tvMatchSource")) {
      throw error;
    }

    try {
      const legacySettings = await prisma.tvPresentationSettings.findUnique({
        where: { arenaId },
        select: {
          slideIntervalSeconds: true,
          selectedTournamentId: true,
          showSponsors: true,
          showRanking: true,
          showMonthlyPrize: true,
          showNightWinner: true,
          monthlyPrizeTitle: true,
          monthlyPrizeAmount: true,
          monthlyPrizeDescription: true,
          nightWinnerTitle: true,
          nightWinnerName: true,
          nightWinnerDescription: true
        }
      });

      if (!legacySettings) {
        return null;
      }

      return {
        ...legacySettings,
        tvMatchSource: "MANUAL",
        selectedRankingIds: [],
        showMatches: true,
        showCalendar: true
      } satisfies TvSettingsPayload;
    } catch (legacyError) {
      if (isPrismaSchemaOutdatedError(legacyError)) {
        return null;
      }

      throw legacyError;
    }
  }
}

async function getTvSponsors(arenaId: string) {
  try {
    const sponsors = await prisma.tvSponsor.findMany({
      where: { arenaId },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        subtitle: true,
        logoUrl: true,
        displayOrder: true
      }
    });

    return sponsors satisfies TvSponsorPayload[];
  } catch (error) {
    if (!isPrismaSchemaOutdatedError(error)) {
      throw error;
    }

    try {
      const legacySponsors = await prisma.tvSponsor.findMany({
        where: { arenaId },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          subtitle: true,
          displayOrder: true
        }
      });

      return legacySponsors.map((sponsor) => ({
        ...sponsor,
        logoUrl: ""
      })) satisfies TvSponsorPayload[];
    } catch (legacyError) {
      if (isPrismaSchemaOutdatedError(legacyError)) {
        return [];
      }

      throw legacyError;
    }
  }
}

async function getTvCalendarEntries(arenaId: string) {
  const now = new Date();
  const calendarEventModel = (prisma as unknown as { calendarEvent?: { findMany: (args: unknown) => Promise<Array<{ id: string; scheduledAt: Date; title: string; notes: string; eventType: string }>> } }).calendarEvent;

  const [lessons, calendarEvents] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        arenaId,
        scheduledAt: {
          gte: now
        }
      },
      include: {
        teacher: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        scheduledAt: "asc"
      },
      take: 12
    }),
    calendarEventModel
      ? calendarEventModel.findMany({
          where: {
            arenaId,
            scheduledAt: {
              gte: now
            }
          },
          orderBy: {
            scheduledAt: "asc"
          },
          take: 12
        })
      : Promise.resolve([])
  ]);

  const items = [
    ...lessons
      .filter((lesson) => lesson.scheduledAt)
      .map((lesson) => ({
        id: `lesson-${lesson.id}`,
        date: lesson.scheduledAt as Date,
        title: lesson.title,
        meta: lesson.teacher?.name ? `Professor ${lesson.teacher.name}` : "Aula agendada",
        typeLabel: "Aula"
      })),
    ...calendarEvents.map((event) => ({
      id: `event-${event.id}`,
      date: event.scheduledAt,
      title: event.title,
      meta: event.notes.trim() || "Evento agendado",
      typeLabel: event.eventType || "Evento"
    }))
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 6);

  return {
    rangeLabel: "Proximos eventos",
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      meta: item.meta,
      dateLabel: formatCalendarDate(item.date),
      timeLabel: formatCalendarTime(item.date),
      typeLabel: item.typeLabel
    })) satisfies TvCalendarEntry[]
  };
}

async function getAdditionalRankingSlides(arenaId: string, rankingIds: string[]) {
  if (!rankingIds.length) {
    return [] as TvRankingSlide[];
  }

  const rankings = await prisma.rankingProfile.findMany({
    where: {
      arenaId,
      id: {
        in: rankingIds
      }
    },
    select: {
      id: true,
      name: true
    },
    orderBy: {
      name: "asc"
    }
  });

  const tournamentEntries = await prisma.tournamentPlayer.findMany({
    where: {
      tournament: {
        arenaId,
        rankingId: {
          in: rankings.map((ranking) => ranking.id)
        }
      }
    },
    select: {
      tournament: {
        select: {
          rankingId: true
        }
      },
      playerId: true,
      tournamentPoints: true,
      player: {
        select: {
          name: true
        }
      }
    }
  });

  return rankings.map((ranking) => {
    const grouped = new Map<string, { id: string; name: string; points: number }>();

    for (const entry of tournamentEntries) {
      if (entry.tournament.rankingId !== ranking.id) {
        continue;
      }

      const current = grouped.get(entry.playerId) ?? {
        id: entry.playerId,
        name: entry.player.name,
        points: 0
      };

      current.points += entry.tournamentPoints;
      grouped.set(entry.playerId, current);
    }

    return {
      id: ranking.id,
      title: ranking.name,
      entries: [...grouped.values()]
        .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
        .slice(0, 8)
    };
  }).filter((ranking) => ranking.entries.length);
}

export async function getTvPresentationPayload(arenaId: string) {
  const [manualMatches, settings, sponsors, calendar]: [
    Awaited<ReturnType<typeof getManualUpcomingMatchesPayload>>,
    TvSettingsPayload,
    TvSponsorPayload[],
    { rangeLabel: string; items: TvCalendarEntry[] }
  ] = await Promise.all([
    getManualUpcomingMatchesPayload(arenaId),
    getTvSettings(arenaId),
    getTvSponsors(arenaId),
    getTvCalendarEntries(arenaId)
  ]);

  const matches = settings?.tvMatchSource === "TOURNAMENT"
    ? await getTournamentUpcomingMatchesPayload(arenaId)
    : manualMatches;

  const selectedTournament = settings?.selectedTournamentId
    ? await prisma.tournament.findFirst({
        where: {
          id: settings.selectedTournamentId,
          arenaId
        },
        select: {
          id: true,
          name: true
        }
      }).catch((error) => {
        if (isPrismaSchemaOutdatedError(error)) {
          return null;
        }

        throw error;
      })
    : null;

  const ranking = selectedTournament
    ? (await prisma.tournamentPlayer.findMany({
        where: {
          tournamentId: selectedTournament.id
        },
        orderBy: [{ tournamentPoints: "desc" }, { seedPoints: "desc" }, { player: { name: "asc" } }],
        take: 8,
        select: {
          id: true,
          tournamentPoints: true,
          player: {
            select: {
              name: true
            }
          }
        }
      })).map((entry) => ({
        id: entry.id,
        name: entry.player.name,
        points: entry.tournamentPoints
      }))
    : await prisma.player.findMany({
        where: {
          arenaId,
          active: true
        },
        orderBy: [{ points: "desc" }, { name: "asc" }],
        take: 8,
        select: {
          id: true,
          name: true,
          points: true
        }
      });

  const rankingSlides = await getAdditionalRankingSlides(arenaId, settings?.selectedRankingIds ?? []);

  return {
    matches,
    settings: {
      slideIntervalSeconds: settings?.slideIntervalSeconds ?? 12,
      selectedTournamentId: selectedTournament?.id ?? "",
      tvMatchSource: settings?.tvMatchSource ?? "MANUAL",
      selectedRankingIds: settings?.selectedRankingIds ?? [],
      selectedTournamentName: selectedTournament?.name ?? "",
      showMatches: settings?.showMatches ?? true,
      showCalendar: settings?.showCalendar ?? true,
      showSponsors: settings?.showSponsors ?? false,
      showRanking: settings?.showRanking ?? false,
      showMonthlyPrize: settings?.showMonthlyPrize ?? false,
      showNightWinner: settings?.showNightWinner ?? false,
      monthlyPrizeTitle: settings?.monthlyPrizeTitle ?? "Premiação mensal",
      monthlyPrizeAmount: settings?.monthlyPrizeAmount ?? "1º - R$200 em crédito da arena",
      monthlyPrizeDescription: settings?.monthlyPrizeDescription ?? "2º - Um tubo de bolinha + R$50 em crédito da arena | 3Âº - Um grip + R$25 em crédito",
      nightWinnerTitle: settings?.nightWinnerTitle ?? "Vencedor da noite",
      nightWinnerName: settings?.nightWinnerName ?? "Super 12",
      nightWinnerDescription: settings?.nightWinnerDescription ?? "Ganha uma vaga cortesia para o Super 12 da próxima semana. O uso é obrigatório na semana seguinte."
    },
    sponsors,
    ranking,
    rankingSlides,
    calendar
  };
}



