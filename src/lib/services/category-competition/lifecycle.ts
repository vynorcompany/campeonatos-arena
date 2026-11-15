import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildPlacementAwards, buildPlacementStages } from "@/lib/tournament-category/ranking";
import { type RankingModel } from "@/lib/validators/ranking";
import { rankStandings } from "@/lib/tournament-category/standings";
import { CreateCategoryCompetitionInput, buildRuleMap, categoryCompetitionStatus, getGroupStandings, runSerializableTransaction } from "@/lib/services/category-competition/shared";

export async function createCategoryCompetition(
  arenaId: string,
  input: CreateCategoryCompetitionInput,
) {
  return runSerializableTransaction(arenaId, async (tx) => {
    let rankingId: string | null = null;
    let feedsGeneralRanking = false;

    if (input.rankingId) {
      const rankingRows = await tx.$queryRaw<
        Array<{
          id: string;
          model: RankingModel;
          feedsGeneralRanking: boolean;
        }>
      >`
        SELECT "id", "model", "feedsGeneralRanking"
        FROM "RankingProfile"
        WHERE "id" = ${input.rankingId}
          AND "arenaId" = ${arenaId}
          AND "active" = true
          AND "type" = 'PAIR'::"RankingType"
        FOR UPDATE
      `;
      const ranking = rankingRows[0];
      if (!ranking) {
        throw new Error("Selecione um ranking de duplas válido para esta arena.");
      }
      const expectedModel =
        input.format === "LEAGUE" ? "LEAGUE" : "KNOCKOUT";
      if (ranking.model !== expectedModel) {
        throw new Error(
          `Selecione um ranking do modelo ${
            expectedModel === "LEAGUE" ? "Liga" : "Mata-mata"
          } para este formato.`,
        );
      }

      rankingId = ranking.id;
      feedsGeneralRanking = ranking.feedsGeneralRanking;
    }

    const category = await tx.tournamentCategory.findFirst({
      where: {
        id: input.categoryId,
        active: true,
        tournament: { arenaId },
      },
      select: {
        id: true,
        competition: { select: { id: true } },
      },
    });
    if (!category) {
      throw new Error("Categoria não encontrada nesta arena.");
    }
    if (category.competition) {
      throw new Error("Esta categoria já possui uma competição.");
    }

    await tx.tournamentCategory.update({
      where: { id: category.id },
      data: {
        class: input.class,
        gender: input.gender,
      },
    });

    return tx.categoryCompetition.create({
      data: {
        categoryId: category.id,
        format: input.format,
        rankingId,
        feedsGeneralRanking,
        isPublic: input.isPublic,
        leagueTier: input.format === "LEAGUE" ? input.leagueTier ?? "" : "",
      },
    });
  });
}

export async function updateCategoryPublicVisibility(
  arenaId: string,
  competitionId: string,
  isPublic: boolean,
) {
  return runSerializableTransaction(arenaId, async (tx) => {
    const competition = await tx.categoryCompetition.findFirst({
      where: {
        id: competitionId,
        category: {
          active: true,
          tournament: { arenaId },
        },
      },
      select: { id: true },
    });
    if (!competition) {
      throw new Error("Categoria não encontrada nesta arena.");
    }

    return tx.categoryCompetition.update({
      where: { id: competition.id },
      data: { isPublic },
      select: {
        id: true,
        isPublic: true,
      },
    });
  });
}

export async function reopenCategoryLeagueForEditing(
  arenaId: string,
  competitionId: string,
) {
  return runSerializableTransaction(arenaId, async (tx) => {
    const competition = await tx.categoryCompetition.findFirst({
      where: {
        id: competitionId,
        format: "LEAGUE",
        status: categoryCompetitionStatus.PUBLISHED,
        category: { active: true, tournament: { arenaId } },
      },
      select: { id: true },
    });
    if (!competition) throw new Error("Somente uma Liga publicada pode voltar para edição.");

    const playedMatch = await tx.categoryMatch.findFirst({
      where: {
        competitionId: competition.id,
        OR: [
          { winnerPairId: { not: null } },
          { homeScore: { not: null } },
          { awayScore: { not: null } },
          { homeSet1: { not: null } },
          { awaySet1: { not: null } },
          { homeSet2: { not: null } },
          { awaySet2: { not: null } },
          { homeSet3: { not: null } },
          { awaySet3: { not: null } },
          { manualStatus: { in: ["LIVE", "FINISHED"] } },
        ],
      },
      select: { id: true },
    });
    if (playedMatch) throw new Error("A Liga não pode voltar para edição após o início de um jogo.");

    await tx.categoryMatch.deleteMany({ where: { competitionId: competition.id } });
    await tx.categoryPair.updateMany({ where: { competitionId: competition.id }, data: { groupId: null } });
    await tx.categoryGroup.deleteMany({ where: { competitionId: competition.id } });
    return tx.categoryCompetition.update({ where: { id: competition.id }, data: { status: categoryCompetitionStatus.DRAFT } });
  });
}

export async function finishCategoryCompetition(
  arenaId: string,
  competitionId: string,
) {
  try {
    return await runSerializableTransaction(
      arenaId,
      async (tx) => {
        const competition = await tx.categoryCompetition.findFirst({
          where: {
            id: competitionId,
            category: {
              tournament: { arenaId },
            },
          },
          select: {
            id: true,
            format: true,
            status: true,
            feedsGeneralRanking: true,
            rankingId: true,
            application: {
              select: { id: true },
            },
            ranking: {
              select: {
                type: true,
                model: true,
                rules: {
                  select: {
                    stageKey: true,
                    points: true,
                  },
                },
              },
            },
            pairs: {
              where: { active: true },
              orderBy: { drawOrder: "asc" },
              select: {
                id: true,
                players: {
                  select: { playerId: true },
                },
              },
            },
            matches: {
              orderBy: { roundOrder: "asc" },
              select: {
                stage: true,
                homePairId: true,
                awayPairId: true,
                homeScore: true,
                awayScore: true,
                winnerPairId: true,
              },
            },
          },
        });
        if (!competition) {
          throw new Error("Competição não encontrada nesta arena.");
        }
        if (competition.application) {
          return false;
        }
        if (competition.status !== categoryCompetitionStatus.PUBLISHED) {
          throw new Error("Somente uma competição publicada pode ser encerrada.");
        }
        if (
          competition.matches.some(
            (match) =>
              !match.homePairId ||
              !match.awayPairId ||
              !match.winnerPairId ||
              match.homeScore == null ||
              match.awayScore == null,
          )
        ) {
          throw new Error("Conclua todos os jogos antes de encerrar a categoria.");
        }
        if (competition.ranking && competition.ranking.type !== "PAIR") {
          throw new Error("A categoria só pode pontuar um ranking de duplas.");
        }
        const expectedRankingModel =
          competition.format === "LEAGUE" ? "LEAGUE" : "KNOCKOUT";
        if (
          competition.ranking &&
          competition.ranking.model !== expectedRankingModel
        ) {
          throw new Error(
            "O modelo do ranking não é compatível com o formato da categoria.",
          );
        }
        if (competition.feedsGeneralRanking && !competition.ranking) {
          throw new Error(
            "Selecione um ranking com tabela de pontos antes de alimentar o Ranking Geral.",
          );
        }

        const standings =
          competition.format === "LEAGUE"
            ? await getGroupStandings(tx, competition.id)
            : [];
        const leagueOrder =
          competition.format === "LEAGUE"
            ? rankStandings(
                standings.flatMap((group) => group.rows),
                standings.flatMap((group) => group.matches),
              ).map((row) => row.pairId)
            : [];
        const stages = buildPlacementStages({
          format: competition.format,
          pairIds: competition.pairs.map((pair) => pair.id),
          matches: competition.matches,
          leagueOrder,
        });
        const rules = competition.ranking
          ? buildRuleMap(
              competition.ranking.rules,
              competition.ranking.model,
            )
          : {
              CHAMPION: 0,
              RUNNER_UP: 0,
              THIRD: 0,
              SEMIFINAL: 0,
              QUARTERFINAL: 0,
              PARTICIPATION: 0,
            };
        const awards = buildPlacementAwards(stages, rules);

        for (const pair of competition.pairs) {
          const points = awards.get(pair.id) ?? 0;
          await tx.categoryPair.update({
            where: { id: pair.id },
            data: { totalPoints: points },
          });

          if (competition.feedsGeneralRanking && points) {
            for (const pairPlayer of pair.players) {
              await tx.player.update({
                where: { id: pairPlayer.playerId },
                data: {
                  points: { increment: points },
                },
              });
            }
          }
        }

        await tx.categoryRankingApplication.create({
          data: {
            competitionId: competition.id,
            rankingId: competition.rankingId,
            feedsGeneralRanking: competition.feedsGeneralRanking,
          },
        });
        await tx.categoryCompetition.update({
          where: { id: competition.id },
          data: { status: categoryCompetitionStatus.FINISHED },
        });

        return true;
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      const application = await prisma.categoryRankingApplication.findFirst({
        where: {
          competitionId,
          competition: {
            category: {
              tournament: { arenaId },
            },
          },
        },
        select: { id: true },
      });
      if (application) {
        return false;
      }
    }
    throw error;
  }
}
