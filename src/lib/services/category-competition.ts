import { Prisma, type CompetitionFormat } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  canAddCategoryPair,
  buildGroups,
  buildKnockout,
  buildRoundRobin,
} from "@/lib/tournament-category/draw";
import { validateManualPairEligibility } from "@/lib/tournament-category/eligibility";
import {
  buildPlacementAwards,
  buildPlacementStages,
  type PlacementRuleMap,
  type PlacementStage,
} from "@/lib/tournament-category/ranking";
import {
  rankStandings,
  selectQuarterfinalists,
} from "@/lib/tournament-category/standings";
import type { GroupStandings, StandingMatch } from "@/lib/tournament-category/types";

const categoryCompetitionStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  FINISHED: "FINISHED",
} as const;

const categoryMatchStage = {
  GROUP: "GROUP",
  QUARTERFINAL: "QUARTERFINAL",
  SEMIFINAL: "SEMIFINAL",
  FINAL: "FINAL",
} as const;

async function runSerializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  const maximumAttempts = 3;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const canRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < maximumAttempts;
      if (!canRetry) {
        throw error;
      }
    }
  }

  throw new Error("Não foi possível serializar a operação da competição.");
}

async function lockRankingProfile(
  tx: Prisma.TransactionClient,
  rankingId: string,
) {
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtext(${rankingId}))
  `;
}

type CreateCategoryCompetitionInput = {
  categoryId: string;
  class: string;
  gender: string;
  format: CompetitionFormat;
  rankingId: string | null;
  feedsGeneralRanking: boolean;
};

type PairResultMatch = {
  stage: string;
  homePairId: string | null;
  awayPairId: string | null;
  winnerPairId: string | null;
};

function buildRuleMap(
  rules: Array<{ stageKey: string; points: number }>,
): PlacementRuleMap {
  const values = new Map(rules.map((rule) => [rule.stageKey, rule.points]));
  const stageKeys: PlacementStage[] = [
    "CHAMPION",
    "RUNNER_UP",
    "SEMIFINAL",
    "QUARTERFINAL",
    "PARTICIPATION",
  ];

  for (const stageKey of stageKeys) {
    if (!values.has(stageKey)) {
      throw new Error(`O ranking não possui pontuação para ${stageKey}.`);
    }
  }

  return Object.fromEntries(
    stageKeys.map((stageKey) => [stageKey, values.get(stageKey) ?? 0]),
  ) as PlacementRuleMap;
}

function getWinnerPairId(
  homePairId: string,
  awayPairId: string,
  homeScore: number,
  awayScore: number,
) {
  return homeScore > awayScore ? homePairId : awayPairId;
}

function getKnockoutLabel(stage: string, stageIndex: number) {
  if (stage === categoryMatchStage.QUARTERFINAL) {
    return `Quartas de final ${stageIndex + 1}`;
  }
  if (stage === categoryMatchStage.SEMIFINAL) {
    return `Semifinal ${stageIndex + 1}`;
  }
  return "Final";
}

function buildStandingsRows(
  pairIds: string[],
  matches: StandingMatch[],
) {
  return pairIds.map((pairId) => {
    let victories = 0;
    let differential = 0;

    for (const match of matches) {
      if (match.homePairId !== pairId && match.awayPairId !== pairId) {
        continue;
      }

      if (match.winnerPairId === pairId) {
        victories += 1;
      }

      if (match.homeScore == null || match.awayScore == null) {
        continue;
      }

      differential +=
        match.homePairId === pairId
          ? match.homeScore - match.awayScore
          : match.awayScore - match.homeScore;
    }

    return { pairId, victories, differential };
  });
}

async function getGroupStandings(
  tx: Prisma.TransactionClient,
  competitionId: string,
): Promise<GroupStandings[]> {
  const groups = await tx.categoryGroup.findMany({
    where: { competitionId },
    orderBy: { drawOrder: "asc" },
    include: {
      pairs: {
        orderBy: { drawOrder: "asc" },
        select: { id: true },
      },
      matches: {
        where: { stage: categoryMatchStage.GROUP },
        orderBy: { roundOrder: "asc" },
        select: {
          homePairId: true,
          awayPairId: true,
          homeScore: true,
          awayScore: true,
          winnerPairId: true,
        },
      },
    },
  });

  return groups.map((group) => {
    const matches = group.matches
      .filter(
        (
          match,
        ): match is typeof match & {
          homePairId: string;
          awayPairId: string;
        } => Boolean(match.homePairId && match.awayPairId),
      )
      .map((match) => ({
        homePairId: match.homePairId,
        awayPairId: match.awayPairId,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        winnerPairId: match.winnerPairId,
      }));

    return {
      rows: buildStandingsRows(
        group.pairs.map((pair) => pair.id),
        matches,
      ),
      matches,
    };
  });
}

async function resetKnockoutFromStandings(
  tx: Prisma.TransactionClient,
  competitionId: string,
  format: CompetitionFormat,
) {
  if (format === "LEAGUE") {
    return;
  }

  const standings = await getGroupStandings(tx, competitionId);
  const qualifiedPairIds = selectQuarterfinalists(standings);
  const knockout = buildKnockout(format, qualifiedPairIds);
  const quarterfinals = await tx.categoryMatch.findMany({
    where: {
      competitionId,
      stage: categoryMatchStage.QUARTERFINAL,
    },
    orderBy: { roundOrder: "asc" },
    select: { id: true },
  });

  const quarterfinalBlueprint = knockout.filter(
    (match) => match.stage === categoryMatchStage.QUARTERFINAL,
  );
  if (quarterfinals.length !== quarterfinalBlueprint.length) {
    throw new Error("A chave de quartas de final está incompleta.");
  }

  await tx.categoryMatch.updateMany({
    where: {
      competitionId,
      stage: {
        in: [categoryMatchStage.SEMIFINAL, categoryMatchStage.FINAL],
      },
    },
    data: {
      homePairId: null,
      awayPairId: null,
      homeScore: null,
      awayScore: null,
      winnerPairId: null,
    },
  });

  for (const [index, match] of quarterfinals.entries()) {
    const blueprint = quarterfinalBlueprint[index];
    await tx.categoryMatch.update({
      where: { id: match.id },
      data: {
        homePairId: blueprint.homePairId,
        awayPairId: blueprint.awayPairId,
        homeScore: null,
        awayScore: null,
        winnerPairId: null,
      },
    });
  }
}

async function clearTargetDescendant(
  tx: Prisma.TransactionClient,
  competitionId: string,
  stage: string,
  stageIndex: number,
) {
  if (stage !== categoryMatchStage.SEMIFINAL) {
    return;
  }

  const final = await tx.categoryMatch.findFirst({
    where: {
      competitionId,
      stage: categoryMatchStage.FINAL,
    },
    select: {
      id: true,
      homePairId: true,
      awayPairId: true,
    },
  });
  if (!final) {
    return;
  }

  await tx.categoryMatch.update({
    where: { id: final.id },
    data: {
      ...(stageIndex === 0 ? { homePairId: null } : { awayPairId: null }),
      homeScore: null,
      awayScore: null,
      winnerPairId: null,
    },
  });
}

async function advanceKnockoutWinner(
  tx: Prisma.TransactionClient,
  match: PairResultMatch & { id: string; competitionId: string },
  winnerPairId: string,
) {
  if (match.stage === categoryMatchStage.FINAL) {
    return;
  }

  const sourceMatches = await tx.categoryMatch.findMany({
    where: {
      competitionId: match.competitionId,
      stage: match.stage,
    },
    orderBy: { roundOrder: "asc" },
    select: { id: true },
  });
  const sourceIndex = sourceMatches.findIndex((item) => item.id === match.id);
  if (sourceIndex < 0) {
    throw new Error("Jogo eliminatório inválido.");
  }

  const targetStage =
    match.stage === categoryMatchStage.QUARTERFINAL
      ? categoryMatchStage.SEMIFINAL
      : categoryMatchStage.FINAL;
  const targetIndex =
    match.stage === categoryMatchStage.QUARTERFINAL
      ? Math.floor(sourceIndex / 2)
      : 0;
  const targetMatches = await tx.categoryMatch.findMany({
    where: {
      competitionId: match.competitionId,
      stage: targetStage,
    },
    orderBy: { roundOrder: "asc" },
    select: {
      id: true,
      homePairId: true,
      awayPairId: true,
      winnerPairId: true,
    },
  });
  const target = targetMatches[targetIndex];
  if (!target) {
    throw new Error("Próximo jogo da chave não encontrado.");
  }

  const slot = sourceIndex % 2 === 0 ? "homePairId" : "awayPairId";
  const participantChanged = target[slot] !== winnerPairId;
  if (participantChanged && target.winnerPairId) {
    await clearTargetDescendant(
      tx,
      match.competitionId,
      targetStage,
      targetIndex,
    );
  }

  await tx.categoryMatch.update({
    where: { id: target.id },
    data: {
      [slot]: winnerPairId,
      ...(participantChanged
        ? {
            homeScore: null,
            awayScore: null,
            winnerPairId: null,
          }
        : {}),
    },
  });
}

export async function createCategoryCompetition(
  arenaId: string,
  input: CreateCategoryCompetitionInput,
) {
  if (input.feedsGeneralRanking && !input.rankingId) {
    throw new Error(
      "Selecione um ranking de duplas com tabela de pontos para alimentar o Ranking Geral.",
    );
  }

  return runSerializableTransaction(async (tx) => {
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

    if (input.rankingId) {
      await lockRankingProfile(tx, input.rankingId);
      const ranking = await tx.rankingProfile.findFirst({
        where: {
          id: input.rankingId,
          arenaId,
          active: true,
          type: "PAIR",
        },
        select: { id: true },
      });
      if (!ranking) {
        throw new Error("Selecione um ranking de duplas válido para esta arena.");
      }
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
        rankingId: input.rankingId,
        feedsGeneralRanking: input.feedsGeneralRanking,
      },
    });
  });
}

export async function addManualPair(
  arenaId: string,
  competitionId: string,
  firstPlayerId: string,
  secondPlayerId: string,
) {
  return runSerializableTransaction(
    async (tx) => {
      const competition = await tx.categoryCompetition.findFirst({
        where: {
          id: competitionId,
          status: categoryCompetitionStatus.DRAFT,
          category: {
            active: true,
            tournament: { arenaId },
          },
        },
        select: {
          id: true,
          format: true,
          category: {
            select: {
              class: true,
              gender: true,
              tournament: {
                select: { arenaId: true },
              },
            },
          },
          pairs: {
            select: {
              players: {
                select: { playerId: true },
              },
            },
          },
        },
      });
      if (!competition) {
        throw new Error("Competição em rascunho não encontrada nesta arena.");
      }

      if (!canAddCategoryPair(competition.format, competition.pairs.length)) {
        throw new Error("O formato Simples suporta no máximo 16 duplas.");
      }

      const requestedPlayerIds = [firstPlayerId, secondPlayerId];
      const players = await tx.player.findMany({
        where: {
          id: { in: requestedPlayerIds },
        },
        select: {
          id: true,
          name: true,
          arenaId: true,
          active: true,
          class: true,
          gender: true,
          points: true,
        },
      });
      const playersById = new Map(players.map((player) => [player.id, player]));
      const orderedPlayers = requestedPlayerIds
        .map((playerId) => playersById.get(playerId))
        .filter((player): player is NonNullable<typeof player> => Boolean(player));

      validateManualPairEligibility(
        {
          arenaId: competition.category.tournament.arenaId,
          className: competition.category.class,
          gender: competition.category.gender,
        },
        orderedPlayers.map((player) => ({
          id: player.id,
          arenaId: player.arenaId,
          active: player.active,
          className: player.class,
          gender: player.gender,
        })),
        competition.pairs.map((pair) =>
          pair.players.map((pairPlayer) => pairPlayer.playerId),
        ),
      );

      const lastPair = await tx.categoryPair.findFirst({
        where: { competitionId: competition.id },
        orderBy: { drawOrder: "desc" },
        select: { drawOrder: true },
      });

      return tx.categoryPair.create({
        data: {
          competitionId: competition.id,
          name: `${orderedPlayers[0].name} / ${orderedPlayers[1].name}`,
          totalPoints: orderedPlayers.reduce(
            (total, player) => total + player.points,
            0,
          ),
          drawOrder: (lastPair?.drawOrder ?? 0) + 1,
          players: {
            create: orderedPlayers.map((player, index) => ({
              playerId: player.id,
              slot: index + 1,
            })),
          },
        },
      });
    },
  );
}

export async function generateCategoryDraw(
  arenaId: string,
  competitionId: string,
) {
  return runSerializableTransaction(async (tx) => {
    const competition = await tx.categoryCompetition.findFirst({
      where: {
        id: competitionId,
        status: categoryCompetitionStatus.DRAFT,
        category: {
          active: true,
          tournament: { arenaId },
        },
      },
      select: {
        id: true,
        format: true,
        pairs: {
          orderBy: { drawOrder: "asc" },
          select: { id: true },
        },
      },
    });
    if (!competition) {
      throw new Error("Somente uma competição em rascunho pode ser sorteada.");
    }
    if (!competition.pairs.length) {
      throw new Error("Adicione duplas antes de gerar o sorteio.");
    }

    const groups = buildGroups({
      format: competition.format,
      pairIds: competition.pairs.map((pair) => pair.id),
    });

    await tx.categoryMatch.deleteMany({
      where: { competitionId: competition.id },
    });
    await tx.categoryPair.updateMany({
      where: { competitionId: competition.id },
      data: { groupId: null },
    });
    await tx.categoryGroup.deleteMany({
      where: { competitionId: competition.id },
    });

    for (const [groupIndex, group] of groups.entries()) {
      const createdGroup = await tx.categoryGroup.create({
        data: {
          competitionId: competition.id,
          name: group.name,
          drawOrder: groupIndex + 1,
        },
      });
      await tx.categoryPair.updateMany({
        where: {
          competitionId: competition.id,
          id: { in: group.pairIds },
        },
        data: { groupId: createdGroup.id },
      });
    }

    return groups;
  });
}

export async function moveCategoryPair(
  arenaId: string,
  pairId: string,
  targetGroupId: string,
) {
  return runSerializableTransaction(async (tx) => {
    const pair = await tx.categoryPair.findFirst({
      where: {
        id: pairId,
        competition: {
          status: categoryCompetitionStatus.DRAFT,
          category: {
            active: true,
            tournament: { arenaId },
          },
        },
      },
      select: {
        id: true,
        competitionId: true,
      },
    });
    if (!pair) {
      throw new Error("Dupla de competição em rascunho não encontrada.");
    }

    const targetGroup = await tx.categoryGroup.findFirst({
      where: {
        id: targetGroupId,
        competitionId: pair.competitionId,
      },
      select: { id: true },
    });
    if (!targetGroup) {
      throw new Error("Grupo de destino inválido.");
    }

    await tx.categoryMatch.deleteMany({
      where: { competitionId: pair.competitionId },
    });
    return tx.categoryPair.update({
      where: { id: pair.id },
      data: { groupId: targetGroup.id },
    });
  });
}

export async function publishCategoryDraw(
  arenaId: string,
  competitionId: string,
) {
  return runSerializableTransaction(async (tx) => {
    const competition = await tx.categoryCompetition.findFirst({
      where: {
        id: competitionId,
        status: categoryCompetitionStatus.DRAFT,
        category: {
          active: true,
          tournament: { arenaId },
        },
      },
      select: {
        id: true,
        format: true,
        pairs: {
          orderBy: { drawOrder: "asc" },
          select: {
            id: true,
            groupId: true,
          },
        },
        groups: {
          orderBy: { drawOrder: "asc" },
          select: {
            id: true,
            name: true,
            pairs: {
              orderBy: { drawOrder: "asc" },
              select: { id: true },
            },
          },
        },
      },
    });
    if (!competition) {
      throw new Error("Somente uma competição em rascunho pode ser publicada.");
    }
    if (
      !competition.groups.length ||
      competition.pairs.some((pair) => !pair.groupId)
    ) {
      throw new Error("Gere os grupos e distribua todas as duplas antes de publicar.");
    }

    const standings: GroupStandings[] = competition.groups.map((group) => ({
      rows: group.pairs.map((pair) => ({
        pairId: pair.id,
        victories: 0,
        differential: 0,
      })),
      matches: [],
    }));
    const qualifiedPairIds =
      competition.format === "LEAGUE"
        ? []
        : selectQuarterfinalists(standings);
    if (
      competition.format !== "LEAGUE" &&
      qualifiedPairIds.length !== 8
    ) {
      throw new Error("A categoria precisa produzir exatamente oito classificadas.");
    }

    await tx.categoryMatch.deleteMany({
      where: { competitionId: competition.id },
    });

    let roundOrder = 0;
    for (const group of competition.groups) {
      const groupMatches = buildRoundRobin(
        group.pairs.map((pair) => pair.id),
      );
      for (const [matchIndex, match] of groupMatches.entries()) {
        roundOrder += 1;
        await tx.categoryMatch.create({
          data: {
            competitionId: competition.id,
            groupId: group.id,
            stage: categoryMatchStage.GROUP,
            label: `${group.name} · Jogo ${matchIndex + 1}`,
            roundOrder,
            homePairId: match.homePairId,
            awayPairId: match.awayPairId,
          },
        });
      }
    }

    const knockout = buildKnockout(competition.format, qualifiedPairIds);
    const stageIndexes = new Map<string, number>();
    for (const match of knockout) {
      roundOrder += 1;
      const stageIndex = stageIndexes.get(match.stage) ?? 0;
      stageIndexes.set(match.stage, stageIndex + 1);
      await tx.categoryMatch.create({
        data: {
          competitionId: competition.id,
          stage: match.stage,
          label: getKnockoutLabel(match.stage, stageIndex),
          roundOrder,
          homePairId: null,
          awayPairId: null,
        },
      });
    }

    await tx.categoryCompetition.update({
      where: { id: competition.id },
      data: { status: categoryCompetitionStatus.PUBLISHED },
    });

    return true;
  });
}

export async function updateCategoryMatchSchedule(
  arenaId: string,
  matchId: string,
  scheduledDate: string | null,
  scheduledTime: string | null,
) {
  return runSerializableTransaction(async (tx) => {
    const match = await tx.categoryMatch.findFirst({
      where: {
        id: matchId,
        competition: {
          category: {
            active: true,
            tournament: { arenaId },
          },
        },
      },
      select: { id: true },
    });
    if (!match) {
      throw new Error("Jogo não encontrado nesta arena.");
    }

    return tx.categoryMatch.update({
      where: { id: match.id },
      data: {
        scheduledDate,
        scheduledTime,
      },
    });
  });
}

export async function recordCategoryMatchResult(
  arenaId: string,
  matchId: string,
  homeScore: number,
  awayScore: number,
) {
  return runSerializableTransaction(async (tx) => {
    const match = await tx.categoryMatch.findFirst({
      where: {
        id: matchId,
        competition: {
          status: categoryCompetitionStatus.PUBLISHED,
          category: {
            active: true,
            tournament: { arenaId },
          },
        },
      },
      select: {
        id: true,
        competitionId: true,
        stage: true,
        homePairId: true,
        awayPairId: true,
        winnerPairId: true,
        competition: {
          select: { format: true },
        },
      },
    });
    if (!match) {
      throw new Error("Jogo publicado não encontrado nesta arena.");
    }
    if (!match.homePairId || !match.awayPairId) {
      throw new Error("Defina as duas duplas antes de salvar o resultado.");
    }

    const winnerPairId = getWinnerPairId(
      match.homePairId,
      match.awayPairId,
      homeScore,
      awayScore,
    );
    await tx.categoryMatch.update({
      where: { id: match.id },
      data: {
        homeScore,
        awayScore,
        winnerPairId,
      },
    });

    if (match.stage === categoryMatchStage.GROUP) {
      const pendingGroupMatches = await tx.categoryMatch.count({
        where: {
          competitionId: match.competitionId,
          stage: categoryMatchStage.GROUP,
          winnerPairId: null,
        },
      });
      if (pendingGroupMatches === 0) {
        await resetKnockoutFromStandings(
          tx,
          match.competitionId,
          match.competition.format,
        );
      }
    } else {
      await advanceKnockoutWinner(tx, match, winnerPairId);
    }

    return true;
  });
}

export async function finishCategoryCompetition(
  arenaId: string,
  competitionId: string,
) {
  try {
    return await runSerializableTransaction(
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
                rules: {
                  select: {
                    stageKey: true,
                    points: true,
                  },
                },
              },
            },
            pairs: {
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
          ? buildRuleMap(competition.ranking.rules)
          : {
              CHAMPION: 0,
              RUNNER_UP: 0,
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
