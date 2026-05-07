import { prisma } from "@/lib/prisma";
import { isPrismaSchemaOutdatedError } from "@/lib/prisma-errors";

type TvSettingsPayload = {
  slideIntervalSeconds: number;
  selectedTournamentId: string | null;
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

function parseScheduledTime(value: string | null | undefined, fallback: Date) {
  if (!value) {
    return fallback;
  }

  const [hour, minute] = value.split(":").map(Number);
  const date = new Date(fallback);

  if (Number.isFinite(hour) && Number.isFinite(minute)) {
    date.setHours(hour, minute, 0, 0);
  }

  return date;
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

async function getTvSettings(arenaId: string) {
  try {
    const settings = await prisma.tvPresentationSettings.findUnique({
      where: { arenaId },
      select: {
        slideIntervalSeconds: true,
        selectedTournamentId: true,
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

    return settings satisfies TvSettingsPayload;
  } catch (error) {
    if (!isPrismaSchemaOutdatedError(error)) {
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
        selectedRankingIds: [],
        showMatches: true,
        showCalendar: false
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
  const end = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14);

  const [lessons, tournamentMatches, manualMatches] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        arenaId,
        scheduledAt: {
          gte: now,
          lte: end
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
      take: 6
    }),
    prisma.match.findMany({
      where: {
        tournament: {
          arenaId
        },
        scheduledTime: {
          not: ""
        }
      },
      include: {
        tournament: {
          select: {
            name: true
          }
        },
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
      orderBy: [{ updatedAt: "asc" }],
      take: 8
    }),
    prisma.manualUpcomingMatch.findMany({
      where: {
        arenaId,
        scheduledTime: {
          not: ""
        }
      },
      orderBy: [{ displayOrder: "asc" }, { updatedAt: "asc" }],
      take: 6
    })
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
    ...tournamentMatches
      .map((match) => ({
        id: `match-${match.id}`,
        date: parseScheduledTime(match.scheduledTime, match.updatedAt),
        title: `${match.homePair?.name ?? "A definir"} x ${match.awayPair?.name ?? "A definir"}`,
        meta: `${match.tournament.name} • ${match.label}`,
        typeLabel: "Jogo"
      }))
      .filter((item) => item.date >= now && item.date <= end),
    ...manualMatches
      .map((match) => ({
        id: `tv-${match.id}`,
        date: parseScheduledTime(match.scheduledTime, match.updatedAt),
        title: `${match.homePairName || "Aguardando"} x ${match.awayPairName || "Aguardando"}`,
        meta: match.courtName || "Quadra a definir",
        typeLabel: "TV"
      }))
      .filter((item) => item.date >= now && item.date <= end)
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 8);

  return {
    rangeLabel: "Próximos 14 dias",
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
  const [matches, settings, sponsors, calendar]: [
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
      selectedRankingIds: settings?.selectedRankingIds ?? [],
      selectedTournamentName: selectedTournament?.name ?? "",
      showMatches: settings?.showMatches ?? true,
      showCalendar: settings?.showCalendar ?? false,
      showSponsors: settings?.showSponsors ?? false,
      showRanking: settings?.showRanking ?? false,
      showMonthlyPrize: settings?.showMonthlyPrize ?? false,
      showNightWinner: settings?.showNightWinner ?? false,
      monthlyPrizeTitle: settings?.monthlyPrizeTitle ?? "Premiação mensal",
      monthlyPrizeAmount: settings?.monthlyPrizeAmount ?? "1º - R$200 em crédito da arena",
      monthlyPrizeDescription: settings?.monthlyPrizeDescription ?? "2º - Um tubo de bolinha + R$50 em crédito da arena | 3º - Um grip + R$25 em crédito",
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
