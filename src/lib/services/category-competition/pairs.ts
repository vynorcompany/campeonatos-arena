import "server-only";
import { Prisma } from "@prisma/client";
import { canAddCategoryPair } from "@/lib/tournament-category/draw";
import { resolveLeagueTier } from "@/lib/league/tier";
import { matchesCompetitionAthleteEligibility, validateManualPairEligibility } from "@/lib/tournament-category/eligibility";
import { categoryCompetitionStatus, runSerializableTransaction } from "@/lib/services/category-competition/shared";

export async function addManualPair(
  arenaId: string,
  competitionId: string,
  firstPlayerId: string,
  secondPlayerId: string,
  thirdPlayerId?: string,
) {
  return runSerializableTransaction(
    arenaId,
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
          leagueTier: true,
          category: {
            select: {
              name: true,
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

      if (competition.format === "TRIO" && !thirdPlayerId) throw new Error("Selecione os três atletas da equipe.");
      if (competition.format !== "TRIO" && thirdPlayerId) throw new Error("Esta categoria aceita somente duplas.");
      const requestedPlayerIds = thirdPlayerId ? [firstPlayerId, secondPlayerId, thirdPlayerId] : [firstPlayerId, secondPlayerId];
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

      const configuredTier = resolveLeagueTier(competition.category.name, competition.leagueTier);
      const memberships = competition.format === "LEAGUE" && (configuredTier === "A" || configuredTier === "B")
        ? await tx.leagueAthleteTier.findMany({
          where: { arenaId, playerId: { in: requestedPlayerIds }, modality: "PADEL", active: true },
          select: { playerId: true, tier: true },
        })
        : [];
      if (memberships.length) {
        const incompatible = memberships.find((membership) => membership.tier !== configuredTier);
        if (incompatible) {
          throw new Error(`Este atleta pertence atualmente à Liga ${incompatible.tier}. A inscrição deve respeitar a Liga ${configuredTier}.`);
        }
      }

      validateManualPairEligibility(
        {
          arenaId: competition.category.tournament.arenaId,
          className: competition.category.class,
          gender: competition.category.gender,
          format: competition.format,
          leagueTier: configuredTier,
        },
        orderedPlayers.map((player) => ({
          id: player.id,
          arenaId: player.arenaId,
          active: player.active,
          className: player.class,
          gender: player.gender,
          leagueTier: competition.format === "LEAGUE" ? memberships.find((membership) => membership.playerId === player.id)?.tier : undefined,
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

      const pair = await tx.categoryPair.create({
        data: {
          competitionId: competition.id,
          name: orderedPlayers.map(player => player.name).join(" / "),
          totalPoints: orderedPlayers.reduce(
            (total, player) => total + player.points,
            0,
          ),
          drawOrder: (lastPair?.drawOrder ?? 0) + 1,
        },
      });

      try {
        await tx.categoryPairPlayer.createMany({
          data: orderedPlayers.map((player, index) => ({
            pairId: pair.id,
            competitionId: competition.id,
            playerId: player.id,
            slot: index + 1,
          })),
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error(
            "Um dos atletas já está vinculado a uma dupla na categoria.",
          );
        }
        throw error;
      }

      return pair;
    },
  );
}

export async function removeCategoryPair(
  arenaId: string,
  pairId: string,
) {
  return runSerializableTransaction(arenaId, async (tx) => {
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

    await tx.categoryMatch.deleteMany({
      where: { competitionId: pair.competitionId },
    });
    await tx.categoryPair.updateMany({
      where: { competitionId: pair.competitionId },
      data: { groupId: null },
    });
    await tx.categoryGroup.deleteMany({
      where: { competitionId: pair.competitionId },
    });

    return tx.categoryPair.delete({
      where: { id: pair.id },
    });
  });
}

export async function moveCategoryPair(
  arenaId: string,
  pairId: string,
  targetGroupId: string,
) {
  return runSerializableTransaction(arenaId, async (tx) => {
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

export async function replaceCategoryPairPlayer(
  arenaId: string,
  input: {
    pairId: string;
    previousPlayerId: string;
    replacementPlayerId: string;
  },
) {
  return runSerializableTransaction(arenaId, async (tx) => {
    const pair = await tx.categoryPair.findFirst({
      where: {
        id: input.pairId,
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
        players: {
          orderBy: { slot: "asc" },
          select: {
            id: true,
            playerId: true,
            slot: true,
            player: {
              select: {
                id: true,
                name: true,
                points: true,
                arenaId: true,
                active: true,
                class: true,
                gender: true,
              },
            },
          },
        },
        competition: {
          select: {
            format: true,
            leagueTier: true,
            category: {
              select: {
                name: true,
                class: true,
                gender: true,
                tournament: { select: { arenaId: true } },
              },
            },
            pairs: {
              where: { id: { not: input.pairId } },
              select: { players: { select: { playerId: true } } },
            },
          },
        },
      },
    });
    if (!pair) {
      throw new Error("A troca só está disponível para uma liga publicada nesta arena.");
    }

    const previous = pair.players.find((pairPlayer) => pairPlayer.playerId === input.previousPlayerId);
    if (!previous) {
      throw new Error("O atleta informado não pertence a esta dupla.");
    }

    const replacement = await tx.player.findFirst({
      where: { id: input.replacementPlayerId, arenaId, active: true },
      select: { id: true, name: true, points: true, arenaId: true, active: true, class: true, gender: true },
    });
    if (!replacement) {
      throw new Error("Atleta substituto não encontrado ou inativo.");
    }

    if (!pair.players.some((pairPlayer) => pairPlayer.id !== previous.id)) {
      throw new Error("A dupla precisa ter dois atletas para realizar a troca.");
    }

    const replacementTier = pair.competition.format === "LEAGUE"
      ? await tx.leagueAthleteTier.findFirst({
          where: { arenaId, playerId: replacement.id, modality: "PADEL", active: true },
          orderBy: { changedAt: "desc" },
          select: { tier: true },
        })
      : null;
    if (!matchesCompetitionAthleteEligibility(
      {
        className: pair.competition.category.class,
        gender: pair.competition.category.gender,
        format: pair.competition.format,
        leagueTier: resolveLeagueTier(pair.competition.category.name, pair.competition.leagueTier),
      },
      { className: replacement.class, gender: replacement.gender, leagueTier: replacementTier?.tier },
    )) {
      throw new Error("O atleta substituto não é elegível para esta categoria.");
    }

    try {
      await tx.categoryPairPlayer.update({
        where: { id: previous.id },
        data: { playerId: replacement.id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error("O atleta substituto já está vinculado a outra dupla nesta categoria.");
      }
      throw error;
    }

    const playersAfterReplacement = pair.players.map((pairPlayer) =>
      pairPlayer.id === previous.id ? replacement : pairPlayer.player,
    );
    const updatedPair = await tx.categoryPair.update({
      where: { id: pair.id },
      data: {
        name: playersAfterReplacement.map((player) => player.name).join(" / "),
        totalPoints: playersAfterReplacement.reduce((total, player) => total + player.points, 0),
      },
    });

    await tx.categoryPairSubstitution.create({
      data: {
        pairId: pair.id,
        competitionId: pair.competitionId,
        previousPlayerId: previous.player.id,
        replacementPlayerId: replacement.id,
        previousPlayerName: previous.player.name,
        replacementPlayerName: replacement.name,
      },
    });

    return updatedPair;
  });
}
