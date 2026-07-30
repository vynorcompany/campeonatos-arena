import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CategoryCompetitionCard,
  CategoryCompetitionForm,
} from "@/components/tournaments/category-competition-form";
import { CategoryDrawPanel } from "@/components/tournaments/category-draw-panel";
import { CategoryRegistrationPanel } from "@/components/tournaments/category-registration-panel";
import { CategoryResultsPanel } from "@/components/tournaments/category-results-panel";
import { StatusBadge } from "@/components/tournaments/status-badge";
import { TournamentDetailLayout } from "@/components/tournaments/tournament-detail-layout";
import { type TournamentTabKey } from "@/components/tournaments/tournament-tabs";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type CategoryPageProps = {
  params: {
    tournamentId: string;
    categoryId: string;
  };
  searchParams?: { tab?: string };
};

const validTabs: TournamentTabKey[] = [
  "overview",
  "registrations",
  "groups",
  "games",
  "results",
];

const formatLabels = {
  LEAGUE: "Liga",
  THREE_GROUPS: "3 grupos",
  FOUR_GROUPS: "4 grupos",
  SIMPLE: "Simples",
} as const;

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const auth = await requireModuleView("tournaments");
  const [category, athletes, pairRankings] = await Promise.all([
    prisma.tournamentCategory.findFirst({
      where: {
        id: params.categoryId,
        tournamentId: params.tournamentId,
        active: true,
        tournament: { arenaId: auth.arenaId },
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
          },
        },
        registrations: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            leadName: true,
            partnerName: true,
            status: true,
            paymentStatus: true,
          },
        },
        competition: {
          include: {
            ranking: {
              select: {
                id: true,
                name: true,
              },
            },
            pairs: {
              orderBy: { drawOrder: "asc" },
              include: {
                players: {
                  orderBy: { slot: "asc" },
                  include: {
                    player: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            groups: {
              orderBy: { drawOrder: "asc" },
              include: {
                pairs: {
                  orderBy: { drawOrder: "asc" },
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            matches: {
              orderBy: { roundOrder: "asc" },
              include: {
                homePair: { select: { id: true, name: true } },
                awayPair: { select: { id: true, name: true } },
                winnerPair: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.player.findMany({
      where: {
        arenaId: auth.arenaId,
        active: true,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        active: true,
        class: true,
        gender: true,
      },
    }),
    prisma.rankingProfile.findMany({
      where: {
        arenaId: auth.arenaId,
        active: true,
        type: "PAIR",
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!category) {
    notFound();
  }

  const requestedTab = searchParams?.tab as TournamentTabKey | undefined;
  const tab =
    requestedTab && validTabs.includes(requestedTab)
      ? requestedTab
      : "overview";
  const competition = category.competition;
  const categoryView = {
    id: category.id,
    name: category.name,
    class: category.class,
    gender: category.gender,
    registrations: category.registrations,
    competition: competition
      ? {
          id: competition.id,
          format: competition.format,
          status: competition.status,
          feedsGeneralRanking: competition.feedsGeneralRanking,
          rankingName: competition.ranking?.name ?? null,
          pairs: competition.pairs.map((pair) => ({
            id: pair.id,
            name: pair.name,
            totalPoints: pair.totalPoints,
            groupId: pair.groupId,
            playerNames: pair.players.map(
              (pairPlayer) => pairPlayer.player.name,
            ),
          })),
          groups: competition.groups.map((group) => ({
            id: group.id,
            name: group.name,
            pairs: group.pairs,
          })),
          matches: competition.matches.map((match) => ({
            id: match.id,
            label: match.label,
            stage: match.stage,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            homePair: match.homePair,
            awayPair: match.awayPair,
            winnerPair: match.winnerPair,
          })),
        }
      : null,
  };

  return (
    <div className="stack-md t-category-workspace">
      <Link
        href={`/torneios/${params.tournamentId}`}
        className="t-category-back"
      >
        <span aria-hidden="true">←</span> Categorias
      </Link>

      <header className="t-category-workspace-header">
        <div className="stack-xs">
          <p className="eyebrow">{category.tournament.name}</p>
          <h1>{category.name}</h1>
          <p className="muted">
            {category.class || "Classe pendente"} ·{" "}
            {category.gender || "Gênero pendente"}
            {competition ? (
              <>
                {" · "}
                {formatLabels[competition.format]} · Ranking: {competition.ranking?.name ?? "Sem ranking"}
              </>
            ) : null}
          </p>
        </div>
        <StatusBadge status={competition?.status ?? "DRAFT"} />
      </header>

      <TournamentDetailLayout
        tournamentId={params.tournamentId}
        categoryId={category.id}
        activeTab={tab}
      >
        {tab === "overview" ? (
          <div className="stack-sm">
            <CategoryCompetitionCard
              tournamentId={params.tournamentId}
              categoryId={category.id}
              category={{
                id: category.id,
                name: category.name,
                class: category.class,
                gender: category.gender,
                competition: competition
                  ? {
                      format: competition.format,
                      status: competition.status,
                      feedsGeneralRanking: competition.feedsGeneralRanking,
                      rankingName: competition.ranking?.name ?? null,
                      pairCount: competition.pairs.length,
                      groupCount: competition.groups.length,
                      matchCount: competition.matches.length,
                      completedMatchCount: competition.matches.filter(
                        (match) => match.winnerPair,
                      ).length,
                    }
                  : null,
              }}
            />
            {!competition ? (
              <article className="section-card">
                <CategoryCompetitionForm
                  categoryId={category.id}
                  categoryName={category.name}
                  pairRankings={pairRankings}
                />
              </article>
            ) : null}
          </div>
        ) : null}

        {tab === "registrations" ? (
          <CategoryRegistrationPanel
            tournamentId={params.tournamentId}
            categories={[categoryView]}
            athletes={athletes}
          />
        ) : null}

        {tab === "groups" ? (
          <CategoryDrawPanel
            tournamentId={params.tournamentId}
            categories={[categoryView]}
          />
        ) : null}

        {tab === "games" ? (
          <CategoryResultsPanel
            tournamentId={params.tournamentId}
            categories={[categoryView]}
            mode="games"
          />
        ) : null}

        {tab === "results" ? (
          <CategoryResultsPanel
            tournamentId={params.tournamentId}
            categories={[categoryView]}
            mode="summary"
          />
        ) : null}
      </TournamentDetailLayout>
    </div>
  );
}
