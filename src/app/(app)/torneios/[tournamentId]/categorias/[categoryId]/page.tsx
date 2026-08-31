import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CategoryCompetitionForm,
  CategoryPublicVisibilityForm,
} from "@/components/tournaments/category-competition-form";
import { CategoryDrawPanel } from "@/components/tournaments/category-draw-panel";
import { CategoryRegistrationPanel } from "@/components/tournaments/category-registration-panel";
import { CategoryResultsPanel } from "@/components/tournaments/category-results-panel";
import { LeagueMedicalRequestsPanel } from "@/components/tournaments/league-medical-requests-panel";
import { LeagueHistoryPanel } from "@/components/tournaments/league-history-panel";
import { LeagueCategorySettingsDialog } from "@/components/tournaments/league-category-settings-dialog";
import { StatusBadge } from "@/components/tournaments/status-badge";
import { TournamentDetailLayout } from "@/components/tournaments/tournament-detail-layout";
import { type TournamentTabKey } from "@/components/tournaments/tournament-tabs";
import { requireModuleView } from "@/lib/auth/guards";
import { runLeagueLifecycleAction, updateLeaguePrizeAction } from "@/lib/actions/category-competition";
import { prisma } from "@/lib/prisma";
import { canGenerateCategoryDraw } from "@/lib/tournament-category/draw";
import { buildPlacementStages } from "@/lib/tournament-category/ranking";
import { rankStandings } from "@/lib/tournament-category/standings";

type CategoryPageProps = {
  params: {
    tournamentId: string;
    categoryId: string;
  };
  searchParams?: { tab?: string; sort?: string; status?: string; player?: string };
};

const validTabs: TournamentTabKey[] = [
  "overview",
  "registrations",
  "groups",
  "games",
  "results",
  "history",
];

function snapshotMatchSummary(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return { matchCount: 0, completedMatches: 0 };
  const matches = (snapshot as { matches?: unknown }).matches;
  if (!Array.isArray(matches)) return { matchCount: 0, completedMatches: 0 };
  return { matchCount: matches.length, completedMatches: matches.filter((match) => Boolean(match && typeof match === "object" && "winnerPair" in match && (match as { winnerPair?: unknown }).winnerPair)).length };
}

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
  const [category, athletes, pairRankings, medicalRequests] = await Promise.all([
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
          where: { status: { not: "CANCELED" } },
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
            leagueCycles: { orderBy: { referenceMonth: "desc" }, select: { id: true, referenceMonth: true, status: true, prizeDescription: true, snapshot: true, championPairId: true, promotedPairId: true, relegatedPairId: true, matches: { select: { winnerPairId: true } } } },
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
    prisma.leagueMedicalSubstitutionRequest.findMany({
      where: { status: "PENDING", pair: { competition: { categoryId: params.categoryId } } },
      include: { pair: { include: { players: { include: { player: { select: { id: true, name: true } } } } } } },
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
  const gameSort =
    searchParams?.sort === "date" || searchParams?.sort === "status"
      ? searchParams.sort
      : "round";
  const gameStatusFilter =
    searchParams?.status === "SCHEDULED" ||
    searchParams?.status === "LIVE" ||
    searchParams?.status === "FINISHED"
      ? searchParams.status
      : "ALL";
  const competition = category.competition;
  const completedSportsMatches =
    competition?.matches.filter(
      (
        match,
      ): match is typeof match & {
        homePairId: string;
        awayPairId: string;
        winnerPairId: string;
        homeScore: number;
        awayScore: number;
      } =>
        Boolean(
          match.homePairId &&
            match.awayPairId &&
            match.winnerPairId &&
            match.homeScore != null &&
            match.awayScore != null,
        ),
    ) ?? [];
  const leagueStandings =
    competition?.format === "LEAGUE"
      ? rankStandings(
          competition.pairs.map((pair) => {
            const pairMatches = completedSportsMatches.filter(
              (match) =>
                match.homePairId === pair.id || match.awayPairId === pair.id,
            );
            return {
              pairId: pair.id,
              victories: pairMatches.filter(
                (match) => match.winnerPairId === pair.id,
              ).length,
              differential: pairMatches.reduce(
                (total, match) =>
                  total +
                  (match.homePairId === pair.id
                    ? match.homeScore - match.awayScore
                    : match.awayScore - match.homeScore),
                0,
              ),
            };
          }),
          completedSportsMatches,
        ).map((row, index) => {
          const matches = completedSportsMatches.filter(
            (match) =>
              match.homePairId === row.pairId ||
              match.awayPairId === row.pairId,
          ).length;
          return {
            position: index + 1,
            pairName:
              competition.pairs.find((pair) => pair.id === row.pairId)?.name ??
              "Dupla removida",
            matches,
            victories: row.victories,
            losses: matches - row.victories,
            differential: row.differential,
          };
        })
      : [];
  const knockoutPlacement =
    competition &&
    competition.format !== "LEAGUE" &&
    completedSportsMatches.some((match) => match.stage === "FINAL")
      ? [...buildPlacementStages({
          format: competition.format,
          pairIds: competition.pairs.map((pair) => pair.id),
          matches: competition.matches,
        })]
          .filter(
            ([, stage]) => stage === "CHAMPION" || stage === "RUNNER_UP",
          )
          .sort(([, first], [, second]) =>
            first === "CHAMPION" ? -1 : second === "CHAMPION" ? 1 : 0,
          )
          .map(([pairId], index) => ({
            position: index + 1,
            pairName:
              competition.pairs.find((pair) => pair.id === pairId)?.name ??
              "Dupla removida",
          }))
      : [];
  const sportsResults = { leagueStandings, knockoutPlacement };
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
          pairs: competition.pairs.map((pair) => ({
            id: pair.id,
            name: pair.name,
            groupId: pair.groupId,
            playerNames: pair.players.map(
              (pairPlayer) => pairPlayer.player.name,
            ),
            playerIds: pair.players.map(
              (pairPlayer) => pairPlayer.player.id,
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
            roundOrder: match.roundOrder,
            scheduledDate: match.scheduledDate,
            scheduledTime: match.scheduledTime,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            homeSet1: match.homeSet1,
            awaySet1: match.awaySet1,
            homeSet2: match.homeSet2,
            awaySet2: match.awaySet2,
            homeSet3: match.homeSet3,
            awaySet3: match.awaySet3,
            manualStatus: match.manualStatus,
            leagueBlock: match.leagueBlock,
            woReason: match.woReason,
            homePair: match.homePair,
            awayPair: match.awayPair,
            winnerPair: match.winnerPair,
            })),
          sportsResults,
        }
      : null,
  };
  const completedMatchCount =
    competition?.matches.filter((match) => match.winnerPair).length ?? 0;
  const nextStep = !competition
    ? {
        label: "Configurar categoria",
        href: `/torneios/${params.tournamentId}/categorias/${category.id}?tab=overview`,
      }
    : competition.status === "FINISHED"
      ? null
      : competition.status === "PUBLISHED"
        ? {
            label:
              competition.matches.length > 0 &&
              completedMatchCount === competition.matches.length
                ? "Encerrar categoria"
                : "Registrar resultados",
            href: `/torneios/${params.tournamentId}/categorias/${category.id}?tab=${competition.matches.length > 0 && completedMatchCount === competition.matches.length ? "results" : "games"}`,
          }
        : !canGenerateCategoryDraw(competition.format, competition.pairs.length)
          ? {
              label: "Adicionar duplas",
              href: `/torneios/${params.tournamentId}/categorias/${category.id}?tab=registrations`,
            }
          : competition.groups.length === 0
            ? {
                label: "Gerar grupos",
                href: `/torneios/${params.tournamentId}/categorias/${category.id}?tab=groups`,
              }
            : {
                label: "Publicar tabela",
                href: `/torneios/${params.tournamentId}/categorias/${category.id}?tab=groups`,
              };

  return (
    <div className="stack-md t-category-workspace">
      <Link
        href={`/torneios/${params.tournamentId}`}
        className="t-category-back"
      >
        <span aria-hidden="true">←</span> Categorias
      </Link>

      <TournamentDetailLayout
        tournamentId={params.tournamentId}
        categoryId={category.id}
        activeTab={tab}
      >
        {tab === "overview" ? (
          <div className="stack-sm">
            <article id={`category-${category.id}`} className="category-overview">
              <div className="category-overview-head">
                <div className="stack-xs">
                  <p className="eyebrow">{category.tournament.name}</p>
                  <div className="category-overview-title-row"><h1>{category.name}</h1>{competition ? <CategoryPublicVisibilityForm competitionId={competition.id} isPublic={competition.isPublic} /> : null}{competition?.format === "LEAGUE" ? <LeagueCategorySettingsDialog category={{ id: category.id, name: category.name, class: category.class, gender: category.gender, leagueTier: competition.leagueTier }} /> : null}</div>
                </div>
                <StatusBadge status={competition?.status ?? "DRAFT"} />
              </div>

              <p className="category-overview-context muted">
                {category.class || "Classe pendente"} · {category.gender || "Gênero pendente"}
                {competition ? (
                  <>
                    {" · "}
                    {formatLabels[competition.format]} · Ranking: {competition.ranking?.name ?? "Sem ranking"}
                  </>
                ) : null}
              </p>

              <dl className="category-overview-metrics">
                <div>
                  <dt>Duplas</dt>
                  <dd>{competition?.pairs.length ?? 0}</dd>
                </div>
                <div>
                  <dt>Jogos</dt>
                  <dd>
                    {completedMatchCount}/{competition?.matches.length ?? 0}
                  </dd>
                </div>
                <div>
                  <dt>Ranking Geral</dt>
                  <dd>{competition?.feedsGeneralRanking ? "Ativo" : "Inativo"}</dd>
                </div>
              </dl>

              <div className="category-overview-action">
                {nextStep ? (
                  <Link href={nextStep.href} className="button button-primary">
                    {nextStep.label}
                  </Link>
                ) : (
                  <span className="pill">Categoria concluída</span>
                )}
              </div>
            </article>
            {competition?.format === "LEAGUE" ? <LeagueMedicalRequestsPanel requests={medicalRequests.map((request) => ({
              id: request.id,
              reason: request.reason,
              requestedAt: request.requestedAt,
              pairName: request.pair.name,
              previousPlayerName: athletes.find((athlete) => athlete.id === request.previousPlayerId)?.name ?? "Atleta anterior",
              replacementPlayerName: athletes.find((athlete) => athlete.id === request.replacementPlayerId)?.name ?? "Novo atleta",
            }))} /> : null}
            {competition?.format === "LEAGUE" ? (
              <section className="league-management-panel" aria-labelledby="league-prize-title">
                <form action={updateLeaguePrizeAction} className="league-prize-form">
                  <div className="league-prize-copy"><p className="eyebrow">Premiação</p><h2 id="league-prize-title">Prêmio do ciclo atual</h2></div>
                  <div className="league-prize-editor">
                    <input type="hidden" name="competitionId" value={competition.id} />
                    <textarea
                      className="league-prize-textarea"
                      name="prizeDescription"
                      rows={4}
                      defaultValue={competition.leagueCycles[0]?.prizeDescription ?? ""}
                      placeholder="Descreva a premiação da Liga. Ex.: campeãs recebem troféu, voucher e premiação em dinheiro."
                    />
                    <div className="league-prize-actions">
                      <button className="button button-primary" type="submit">Salvar premiação</button>
                    </div>
                  </div>
                </form>
                <aside className="league-cycle-actions"><strong>Ciclo mensal</strong><span>Fecha o mês vigente, registra campeã e executa acesso ou rebaixamento.</span><form action={runLeagueLifecycleAction}><input type="hidden" name="competitionId" value={competition.id} /><button className="button button-small" type="submit">Processar ciclo da Liga</button></form></aside>
              </section>
            ) : null}
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
            sort={gameSort}
            statusFilter={gameStatusFilter}
            playerSearch={searchParams?.player?.trim() ?? ""}
          />
        ) : null}

        {tab === "results" ? (
          <CategoryResultsPanel
            tournamentId={params.tournamentId}
            categories={[categoryView]}
            mode="summary"
          />
        ) : null}

        {tab === "history" && competition?.format === "LEAGUE" ? (
          <LeagueHistoryPanel cycles={competition.leagueCycles.map((cycle) => { const snapshot = snapshotMatchSummary(cycle.snapshot); return { id: cycle.id, referenceMonth: cycle.referenceMonth, status: cycle.status, completedMatches: cycle.matches.length ? cycle.matches.filter((match) => Boolean(match.winnerPairId)).length : snapshot.completedMatches, matchCount: cycle.matches.length || snapshot.matchCount, championPairId: cycle.championPairId, promotedPairId: cycle.promotedPairId, relegatedPairId: cycle.relegatedPairId }; })} />
        ) : null}
      </TournamentDetailLayout>
    </div>
  );
}
