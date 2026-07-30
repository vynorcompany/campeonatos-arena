import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { TournamentCategoryManagerForm } from "@/components/forms/tournament-category-manager-form";
import { TournamentForm } from "@/components/forms/tournament-form";
import { SectionCard } from "@/components/section-card";
import {
  CategoryCompetitionCard,
  CategoryCompetitionForm,
} from "@/components/tournaments/category-competition-form";
import { CategoryDrawPanel } from "@/components/tournaments/category-draw-panel";
import { CategoryRegistrationPanel } from "@/components/tournaments/category-registration-panel";
import { CategoryResultsPanel } from "@/components/tournaments/category-results-panel";
import { PublicRegistrationLinkActions } from "@/components/tournaments/public-registration-link-actions";
import { StatusBadge } from "@/components/tournaments/status-badge";
import { TournamentDetailLayout } from "@/components/tournaments/tournament-detail-layout";
import {
  type TournamentTabKey,
} from "@/components/tournaments/tournament-tabs";
import { deleteTournamentAction } from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type TournamentDetailPageProps = {
  params: { tournamentId: string };
  searchParams?: { tab?: string };
};

const validTabs: TournamentTabKey[] = [
  "categories",
  "registrations",
  "pairs-groups",
  "games",
  "results",
];

export default async function TournamentDetailPage({
  params,
  searchParams,
}: TournamentDetailPageProps) {
  const auth = await requireModuleView("tournaments");
  const [tournament, pairRankings, individualRankings] = await Promise.all([
    prisma.tournament.findFirst({
      where: {
        id: params.tournamentId,
        arenaId: auth.arenaId,
      },
      include: {
        arena: {
          select: {
            players: {
              where: { active: true },
              orderBy: { name: "asc" },
              select: {
                id: true,
                name: true,
                active: true,
                class: true,
                gender: true,
              },
            },
          },
        },
        categories: {
          where: { active: true },
          orderBy: { level: "asc" },
          include: {
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
        },
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
    prisma.rankingProfile.findMany({
      where: {
        arenaId: auth.arenaId,
        active: true,
        type: "INDIVIDUAL",
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!tournament) {
    notFound();
  }

  const requestedTab = searchParams?.tab as TournamentTabKey | undefined;
  const tab = requestedTab && validTabs.includes(requestedTab)
    ? requestedTab
    : "categories";

  const categories = tournament.categories.map((category) => {
    const competition = category.competition;

    return {
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
  });

  const finishedCategoryCount = categories.filter(
    (category) => category.competition?.status === "FINISHED",
  ).length;

  return (
    <div className="stack-md">
      <header className="page-header t-sticky-head">
        <div className="stack-xs">
          <p className="eyebrow">Evento</p>
          <h1>{tournament.name}</h1>
          <p className="muted">
            {categories.length} categorias · {finishedCategoryCount} concluídas
          </p>
        </div>
        <div className="section-actions">
          <StatusBadge status={tournament.registrationPhase} />
          {tournament.creationMode === "PUBLIC" ? (
            <PublicRegistrationLinkActions slug={tournament.publicSlug} />
          ) : null}
          <Link href="/torneios" className="button">
            Voltar aos eventos
          </Link>
          <SafeActionForm
            action={deleteTournamentAction}
            confirmKeyword="EXCLUIR"
            confirmPrompt="Digite EXCLUIR para remover este evento permanentemente."
            successMessage="Evento excluído."
          >
            <input type="hidden" name="tournamentId" value={tournament.id} />
            <SubmitButton
              label="Excluir evento"
              pendingLabel="Excluindo..."
              className="button button-danger"
            />
          </SafeActionForm>
        </div>
      </header>

      <details className="section-card">
        <summary>
          <strong>Editar dados do evento</strong>
        </summary>
        <div style={{ marginTop: "1rem" }}>
          <TournamentForm
            mode="update"
            tournamentId={tournament.id}
            defaultName={tournament.name}
            defaultDescription={tournament.description}
            defaultPublicSlug={tournament.publicSlug}
            defaultRegistrationPhase={tournament.registrationPhase}
            defaultCreationMode={
              tournament.creationMode as "MANUAL" | "PUBLIC"
            }
            defaultGroupCount={tournament.groupCount}
            defaultPairsPerGroup={tournament.pairsPerGroup}
            defaultPriceFirstCents={tournament.priceFirstCents}
            defaultPriceSecondCents={tournament.priceSecondCents}
            defaultPriceThirdCents={tournament.priceThirdCents}
            defaultBlockCategoryGap={tournament.blockCategoryGap}
            defaultMaxCategoryGap={tournament.maxCategoryGap}
            defaultCategoryList={JSON.stringify(
              tournament.categories.map((category) => ({
                name: category.name,
                groupCount: category.groupCount,
                pairsPerGroup: category.pairsPerGroup,
                priceSecondCents: category.priceSecondCents / 100,
                priceThirdCents: category.priceThirdCents / 100,
              })),
            )}
            defaultRankingId={tournament.rankingId ?? ""}
            rankings={individualRankings}
            submitLabel="Salvar evento"
            pendingLabel="Salvando..."
          />
        </div>
      </details>

      <TournamentDetailLayout tournamentId={tournament.id} activeTab={tab}>
        {tab === "categories" ? (
          <div className="stack-md">
            <SectionCard
              title="Categorias do evento"
              description="Adicione as categorias e, em seguida, configure cada competição."
            >
              <TournamentCategoryManagerForm
                tournamentId={tournament.id}
                defaultName={tournament.name}
                defaultDescription={tournament.description}
                defaultPublicSlug={tournament.publicSlug}
                defaultRegistrationPhase={tournament.registrationPhase}
                defaultCreationMode={
                  tournament.creationMode as "MANUAL" | "PUBLIC"
                }
                defaultGroupCount={tournament.groupCount}
                defaultPairsPerGroup={tournament.pairsPerGroup}
                defaultPriceFirstCents={tournament.priceFirstCents}
                defaultPriceSecondCents={tournament.priceSecondCents}
                defaultPriceThirdCents={tournament.priceThirdCents}
                defaultBlockCategoryGap={tournament.blockCategoryGap}
                defaultMaxCategoryGap={tournament.maxCategoryGap}
                defaultRankingId={tournament.rankingId ?? ""}
                defaultCategories={tournament.categories.map((category) => ({
                  name: category.name,
                  groupCount: category.groupCount,
                  pairsPerGroup: category.pairsPerGroup,
                  priceSecondCents: category.priceSecondCents,
                  priceThirdCents: category.priceThirdCents,
                  hasCompetition: Boolean(category.competition),
                }))}
              />
            </SectionCard>

            {categories.map((category) => (
              <div className="stack-sm" key={category.id}>
                <CategoryCompetitionCard
                  tournamentId={tournament.id}
                  category={{
                    id: category.id,
                    name: category.name,
                    class: category.class,
                    gender: category.gender,
                    competition: category.competition
                      ? {
                          format: category.competition.format,
                          status: category.competition.status,
                          feedsGeneralRanking:
                            category.competition.feedsGeneralRanking,
                          rankingName: category.competition.rankingName,
                          pairCount: category.competition.pairs.length,
                          groupCount: category.competition.groups.length,
                          matchCount: category.competition.matches.length,
                          completedMatchCount:
                            category.competition.matches.filter(
                              (match) => match.winnerPair,
                            ).length,
                        }
                      : null,
                  }}
                />
                {!category.competition ? (
                  <article className="section-card">
                    <CategoryCompetitionForm
                      categoryId={category.id}
                      categoryName={category.name}
                      pairRankings={pairRankings}
                    />
                  </article>
                ) : null}
              </div>
            ))}

            {!categories.length ? (
              <p className="muted">
                Salve uma categoria para liberar a configuração de formato e
                ranking.
              </p>
            ) : null}
          </div>
        ) : null}

        {tab === "registrations" ? (
          <CategoryRegistrationPanel
            tournamentId={tournament.id}
            categories={categories}
            athletes={tournament.arena.players}
          />
        ) : null}

        {tab === "pairs-groups" ? (
          <CategoryDrawPanel
            tournamentId={tournament.id}
            categories={categories}
          />
        ) : null}

        {tab === "games" ? (
          <CategoryResultsPanel
            tournamentId={tournament.id}
            categories={categories}
            mode="games"
          />
        ) : null}

        {tab === "results" ? (
          <CategoryResultsPanel
            tournamentId={tournament.id}
            categories={categories}
            mode="summary"
          />
        ) : null}
      </TournamentDetailLayout>
    </div>
  );
}
