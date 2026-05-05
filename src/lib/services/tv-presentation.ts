import { prisma } from "@/lib/prisma";
import { isPrismaSchemaOutdatedError } from "@/lib/prisma-errors";

type TvSettingsPayload = {
  slideIntervalSeconds: number;
  selectedTournamentId: string | null;
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
} | null;

type TvSponsorPayload = {
  id: string;
  name: string;
  subtitle: string;
  logoUrl: string;
  displayOrder: number;
};

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
        showMatches: true,
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
        showMatches: true
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

export async function getTvPresentationPayload(arenaId: string) {
  const [matches, settings, sponsors]: [Awaited<ReturnType<typeof getManualUpcomingMatchesPayload>>, TvSettingsPayload, TvSponsorPayload[]] = await Promise.all([
    getManualUpcomingMatchesPayload(arenaId),
    getTvSettings(arenaId),
    getTvSponsors(arenaId)
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

  const ranking = await prisma.player.findMany({
    where: {
      arenaId,
      active: true,
      ...(selectedTournament
        ? {
            entries: {
              some: {
                tournamentId: selectedTournament.id
              }
            }
          }
        : {})
    },
    orderBy: [{ points: "desc" }, { name: "asc" }],
    take: 8,
    select: {
      id: true,
      name: true,
      points: true
    }
  });

  return {
    matches,
    settings: {
      slideIntervalSeconds: settings?.slideIntervalSeconds ?? 12,
      selectedTournamentId: selectedTournament?.id ?? "",
      selectedTournamentName: selectedTournament?.name ?? "",
      showMatches: settings?.showMatches ?? true,
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
    ranking
  };
}
