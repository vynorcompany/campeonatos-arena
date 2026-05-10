"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { savePublicImageUpload } from "@/lib/uploads";
import { requireModuleEdit } from "@/lib/auth/guards";
import {
  archivePlayerSchema,
  createPlayerSchema,
  updatePlayerPointsSchema,
  updatePlayerSchema,
  updateTournamentEntryPointsSchema,
  updateTournamentParticipantsSchema
} from "@/lib/validators/player";
import {
  createRankingProfileSchema,
  deleteRankingProfileSchema,
  updateRankingProfileSchema
} from "@/lib/validators/ranking";
import {
  createTournamentPairSchema,
  deleteTournamentPairSchema,
  moveTournamentPairGroupSchema,
  updateTournamentPairSchema
} from "@/lib/validators/pair";
import {
  updateMatchCourtSchema,
  updateMatchParticipantsSchema,
  updateMatchResultSchema,
  updateMatchScheduleSchema
} from "@/lib/validators/match";
import { createTournamentSchema, updateTournamentSchema } from "@/lib/validators/tournament";
import {
  createTournamentPair,
  deleteTournament,
  deleteTournamentPair,
  distributeTournamentGroups,
  finishTournament,
  generateTournamentMatches,
  generateTournamentPairs,
  moveTournamentPairToGroup,
  recalculateTournamentRankingPoints,
  syncTournamentEntries,
  updateKnockoutParticipants,
  updateTournamentSettings,
  updateTournamentPair,
  updateMatchResult
} from "@/lib/services/tournament";

export type ActionState = {
  error: string | null;
  success: string | null;
};

function refreshTournamentRoutes() {
  revalidatePath("/painel");
  revalidatePath("/torneios");
  revalidatePath("/torneios/rankings");
  revalidatePath("/jogadores");
  revalidatePath("/duplas");
  revalidatePath("/grupos");
  revalidatePath("/jogos");
  revalidatePath("/overview");
  revalidatePath("/tournaments");
  revalidatePath("/players");
  revalidatePath("/pairs");
  revalidatePath("/groups");
  revalidatePath("/matches");
}

function parseTimeToMinutes(value: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.MAX_SAFE_INTEGER;
  return h * 60 + m;
}

async function syncTvUpcomingMatchesFromTournament(arenaId: string) {
  const matches = await prisma.match.findMany({
    where: {
      tournament: {
        arenaId,
        status: {
          not: "FINISHED"
        }
      }
    },
    include: {
      homePair: true,
      awayPair: true
    },
    orderBy: [{ roundOrder: "asc" }, { updatedAt: "asc" }]
  });

  const scheduledPool = matches
    .filter((match) => match.homePairId && match.awayPairId)
    .sort((a, b) => parseTimeToMinutes(a.scheduledTime) - parseTimeToMinutes(b.scheduledTime));

  const nextPendingMatchId = scheduledPool.find((match) => !match.winnerPairId && match.homeScore === null && match.awayScore === null)?.id;
  const top = scheduledPool.slice(0, 8);

  await prisma.$transaction(async (tx) => {
    await tx.manualUpcomingMatch.deleteMany({
      where: { arenaId }
    });

    for (const [index, match] of top.entries()) {
      const status = match.winnerPairId
        ? "FINISHED"
        : match.homeScore !== null || match.awayScore !== null
          ? "LIVE"
          : match.id === nextPendingMatchId
            ? "LIVE"
            : "SCHEDULED";

      await tx.manualUpcomingMatch.create({
        data: {
          arenaId,
          displayOrder: index + 1,
          homePairName: match.homePair?.name ?? "",
          awayPairName: match.awayPair?.name ?? "",
          courtName: match.courtName ?? "",
          scheduledTime: match.scheduledTime ?? "",
          status
        }
      });
    }
  });
}

const rankingRuleBlueprint = [
  { stageKey: "CHAMPION", label: "1Âº lugar", displayOrder: 1, field: "championPoints" as const },
  { stageKey: "RUNNER_UP", label: "2Âº lugar", displayOrder: 2, field: "runnerUpPoints" as const },
  { stageKey: "SEMIFINAL", label: "Semifinal", displayOrder: 3, field: "semifinalPoints" as const },
  { stageKey: "QUARTERFINAL", label: "Quartas de final", displayOrder: 4, field: "quarterfinalPoints" as const },
  { stageKey: "PARTICIPATION", label: "ParticipaÃ§Ã£o", displayOrder: 5, field: "participationPoints" as const }
];

async function ensureRankingBelongsToArena(arenaId: string, rankingId: string | null) {
  if (!rankingId) {
    return null;
  }

  const ranking = await prisma.rankingProfile.findFirst({
    where: {
      id: rankingId,
      arenaId
    },
    select: {
      id: true
    }
  });

  if (!ranking) {
    throw new Error("Ranking invÃ¡lido para esta arena.");
  }

  return ranking.id;
}

async function syncRankingRules(
  rankingId: string,
  values: {
    championPoints: number;
    runnerUpPoints: number;
    semifinalPoints: number;
    quarterfinalPoints: number;
    participationPoints: number;
  }
) {
  await prisma.$transaction(
    rankingRuleBlueprint.map((rule) =>
      prisma.rankingRule.upsert({
        where: {
          rankingId_stageKey: {
            rankingId,
            stageKey: rule.stageKey
          }
        },
        create: {
          rankingId,
          stageKey: rule.stageKey,
          label: rule.label,
          points: values[rule.field],
          displayOrder: rule.displayOrder
        },
        update: {
          label: rule.label,
          points: values[rule.field],
          displayOrder: rule.displayOrder
        }
      })
    )
  );
}

function getPrismaMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "JÃ¡ existe um jogador com esse nome na arena.";
  }

  return fallback;
}

export async function createPlayerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireModuleEdit("players");
  const parsed = createPlayerSchema.safeParse({
    name: formData.get("name"),
    points: formData.get("points")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.", success: null };
  }

  try {
    const photoUrl = await savePublicImageUpload(formData.get("photo") as File | null, "player-photos", auth.arenaId);

    const shouldCreateStudent = formData.get("createStudent") === "on";

    await prisma.$transaction(async (tx) => {
      const player = await tx.player.create({
        data: {
          arenaId: auth.arenaId,
          name: parsed.data.name,
          points: parsed.data.points,
          ...(photoUrl ? { photoUrl } : {})
        }
      });

      if (shouldCreateStudent) {
        const existingStudent = await tx.student.findFirst({
          where: {
            arenaId: auth.arenaId,
            name: player.name
          }
        });

        if (existingStudent) {
          await tx.student.update({
            where: {
              id: existingStudent.id
            },
            data: {
              playerId: player.id
            }
          });
        } else {
          await tx.student.create({
            data: {
              arenaId: auth.arenaId,
              playerId: player.id,
              name: player.name
            }
          });
        }
      }
    });
  } catch (error) {
    return { error: getPrismaMessage(error, "NÃ£o foi possÃ­vel cadastrar o jogador."), success: null };
  }

  refreshTournamentRoutes();
  revalidatePath("/aulas");
  revalidatePath("/financeiro");
  return { error: null, success: "Jogador cadastrado com sucesso." };
}

export async function updatePlayerAction(formData: FormData) {
  const auth = await requireModuleEdit("players");
  const parsed = updatePlayerSchema.safeParse({
    playerId: formData.get("playerId"),
    name: formData.get("name"),
    points: formData.get("points")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.");
  }

  try {
    const photoUrl = await savePublicImageUpload(formData.get("photo") as File | null, "player-photos", auth.arenaId);
    const updated = await prisma.player.updateMany({
      where: {
        id: parsed.data.playerId,
        arenaId: auth.arenaId
      },
      data: {
        name: parsed.data.name,
        points: parsed.data.points,
        ...(photoUrl ? { photoUrl } : {})
      }
    });

    if (!updated.count) {
      throw new Error("Jogador nÃ£o encontrado.");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Jogador nÃ£o encontrado.") {
      throw error;
    }

    throw new Error(getPrismaMessage(error, "NÃ£o foi possÃ­vel atualizar o jogador."));
  }

  refreshTournamentRoutes();
}

export async function archivePlayerAction(formData: FormData) {
  const auth = await requireModuleEdit("players");
  const parsed = archivePlayerSchema.safeParse({
    playerId: formData.get("playerId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.");
  }

  const updated = await prisma.player.updateMany({
    where: {
      id: parsed.data.playerId,
      arenaId: auth.arenaId
    },
    data: {
      active: false
    }
  });

  if (!updated.count) {
    throw new Error("Jogador nÃ£o encontrado.");
  }

  refreshTournamentRoutes();
}

export async function updatePlayerPointsAction(formData: FormData) {
  const auth = await requireModuleEdit("players");
  const parsed = updatePlayerPointsSchema.safeParse({
    playerId: formData.get("playerId"),
    points: formData.get("points")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.");
  }

  const updated = await prisma.player.updateMany({
    where: {
      id: parsed.data.playerId,
      arenaId: auth.arenaId
    },
    data: {
      points: parsed.data.points
    }
  });

  if (!updated.count) {
    throw new Error("Jogador nÃ£o encontrado.");
  }

  refreshTournamentRoutes();
}

export async function resetPlayerRankingAction() {
  const auth = await requireModuleEdit("players");

  await prisma.player.updateMany({
    where: {
      arenaId: auth.arenaId
    },
    data: {
      points: 0
    }
  });

  refreshTournamentRoutes();
}

export async function updateTournamentEntryPointsAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = updateTournamentEntryPointsSchema.safeParse({
    entryId: formData.get("entryId"),
    points: formData.get("points")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.");
  }

  const updated = await prisma.tournamentPlayer.updateMany({
    where: {
      id: parsed.data.entryId,
      tournament: {
        arenaId: auth.arenaId
      }
    },
    data: {
      seedPoints: parsed.data.points
    }
  });

  if (!updated.count) {
    throw new Error("Entrada do campeonato nÃ£o encontrada.");
  }

  refreshTournamentRoutes();
}

export async function createTournamentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireModuleEdit("tournaments");
  const parsed = createTournamentSchema.safeParse({
    name: formData.get("name"),
    groupCount: formData.get("groupCount"),
    pairsPerGroup: formData.get("pairsPerGroup"),
    rankingId: formData.get("rankingId")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.", success: null };
  }

  const existingActiveTournament = await prisma.tournament.findFirst({
    where: {
      arenaId: auth.arenaId,
      status: {
        not: "FINISHED"
      }
    }
  });

  if (existingActiveTournament) {
    return {
      error: "Finalize o campeonato ativo antes de criar um novo.",
      success: null
    };
  }

  const rankingId = await ensureRankingBelongsToArena(auth.arenaId, parsed.data.rankingId || null);

  await prisma.tournament.create({
    data: {
      arenaId: auth.arenaId,
      name: parsed.data.name,
      groupCount: parsed.data.groupCount,
      pairsPerGroup: parsed.data.pairsPerGroup,
      rankingId
    }
  });

  refreshTournamentRoutes();
  return { error: null, success: "Torneio criado com sucesso." };
}

export async function finishTournamentAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio invÃ¡lido.");
  }

  await finishTournament(tournamentId, auth.arenaId);
  refreshTournamentRoutes();
}

export async function updateTournamentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireModuleEdit("tournaments");
  const parsed = updateTournamentSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    name: formData.get("name"),
    groupCount: formData.get("groupCount"),
    pairsPerGroup: formData.get("pairsPerGroup"),
    rankingId: formData.get("rankingId")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.", success: null };
  }

  try {
    const rankingId = await ensureRankingBelongsToArena(auth.arenaId, parsed.data.rankingId || null);
    await updateTournamentSettings(parsed.data.tournamentId, auth.arenaId, {
      name: parsed.data.name,
      groupCount: parsed.data.groupCount,
      pairsPerGroup: parsed.data.pairsPerGroup,
      rankingId
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "NÃ£o foi possÃ­vel atualizar o torneio.",
      success: null
    };
  }

  refreshTournamentRoutes();
  return { error: null, success: "Torneio atualizado com sucesso." };
}

export async function createRankingProfileAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = createRankingProfileSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    championPoints: formData.get("championPoints"),
    runnerUpPoints: formData.get("runnerUpPoints"),
    semifinalPoints: formData.get("semifinalPoints"),
    quarterfinalPoints: formData.get("quarterfinalPoints"),
    participationPoints: formData.get("participationPoints")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.");
  }

  const ranking = await prisma.rankingProfile.create({
    data: {
      arenaId: auth.arenaId,
      name: parsed.data.name,
      description: parsed.data.description
    }
  });

  await syncRankingRules(ranking.id, parsed.data);
  refreshTournamentRoutes();
}

export async function updateRankingProfileAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = updateRankingProfileSchema.safeParse({
    rankingId: formData.get("rankingId"),
    name: formData.get("name"),
    description: formData.get("description"),
    championPoints: formData.get("championPoints"),
    runnerUpPoints: formData.get("runnerUpPoints"),
    semifinalPoints: formData.get("semifinalPoints"),
    quarterfinalPoints: formData.get("quarterfinalPoints"),
    participationPoints: formData.get("participationPoints")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.");
  }

  const updated = await prisma.rankingProfile.updateMany({
    where: {
      id: parsed.data.rankingId,
      arenaId: auth.arenaId
    },
    data: {
      name: parsed.data.name,
      description: parsed.data.description
    }
  });

  if (!updated.count) {
    throw new Error("Ranking nÃ£o encontrado.");
  }

  await syncRankingRules(parsed.data.rankingId, parsed.data);
  const linkedTournaments = await prisma.tournament.findMany({
    where: {
      arenaId: auth.arenaId,
      rankingId: parsed.data.rankingId,
      status: {
        not: "FINISHED"
      }
    },
    select: {
      id: true
    }
  });

  await Promise.all(linkedTournaments.map((tournament) => recalculateTournamentRankingPoints(tournament.id)));
  refreshTournamentRoutes();
}

export async function deleteRankingProfileAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = deleteRankingProfileSchema.safeParse({
    rankingId: formData.get("rankingId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.");
  }

  await prisma.rankingProfile.deleteMany({
    where: {
      id: parsed.data.rankingId,
      arenaId: auth.arenaId
    }
  });

  refreshTournamentRoutes();
}

export async function deleteTournamentAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio invÃ¡lido.");
  }

  await deleteTournament(tournamentId, auth.arenaId);
  refreshTournamentRoutes();
}

export async function syncEntriesAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = updateTournamentParticipantsSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    playerIds: formData.getAll("playerIds").map(String)
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.");
  }

  await syncTournamentEntries(parsed.data.tournamentId, auth.arenaId, parsed.data.playerIds);
  refreshTournamentRoutes();
}

export async function syncEntriesStateAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await syncEntriesAction(formData);
    return { error: null, success: "Participantes do torneio atualizados com sucesso." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "NÃ£o foi possÃ­vel atualizar os participantes.",
      success: null
    };
  }
}

export async function generatePairsAction(formData: FormData) {
  await requireModuleEdit("pairs");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio invÃ¡lido.");
  }

  await generateTournamentPairs(tournamentId);
  refreshTournamentRoutes();
}

export async function createTournamentPairAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireModuleEdit("pairs");
  const parsed = createTournamentPairSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    playerAId: formData.get("playerAId"),
    playerBId: formData.get("playerBId")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.", success: null };
  }

  try {
    await createTournamentPair(parsed.data.tournamentId, parsed.data.playerAId, parsed.data.playerBId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "NÃ£o foi possÃ­vel salvar a dupla.",
      success: null
    };
  }

  refreshTournamentRoutes();
  return { error: null, success: "Dupla criada com sucesso." };
}

export async function updateTournamentPairAction(formData: FormData) {
  const auth = await requireModuleEdit("pairs");
  const parsed = updateTournamentPairSchema.safeParse({
    pairId: formData.get("pairId"),
    playerAId: formData.get("playerAId"),
    playerBId: formData.get("playerBId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.");
  }

  await updateTournamentPair(parsed.data.pairId, auth.arenaId, parsed.data.playerAId, parsed.data.playerBId);
  refreshTournamentRoutes();
}

export async function deleteTournamentPairAction(formData: FormData) {
  const auth = await requireModuleEdit("pairs");
  const parsed = deleteTournamentPairSchema.safeParse({
    pairId: formData.get("pairId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.");
  }

  await deleteTournamentPair(parsed.data.pairId, auth.arenaId);
  refreshTournamentRoutes();
}

export async function moveTournamentPairGroupAction(formData: FormData) {
  const auth = await requireModuleEdit("groups");
  const parsed = moveTournamentPairGroupSchema.safeParse({
    pairId: formData.get("pairId"),
    targetGroupId: formData.get("targetGroupId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.");
  }

  await moveTournamentPairToGroup(parsed.data.pairId, parsed.data.targetGroupId, auth.arenaId);
  refreshTournamentRoutes();
}

export async function generateGroupsAction(formData: FormData) {
  await requireModuleEdit("groups");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio invÃ¡lido.");
  }

  await distributeTournamentGroups(tournamentId);
  refreshTournamentRoutes();
}

export async function generateMatchesAction(formData: FormData) {
  await requireModuleEdit("matches");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio invÃ¡lido.");
  }

  await generateTournamentMatches(tournamentId);
  refreshTournamentRoutes();
}

export async function updateMatchCourtAction(formData: FormData) {
  const auth = await requireModuleEdit("matches");
  const parsed = updateMatchCourtSchema.safeParse({
    matchId: formData.get("matchId"),
    courtName: formData.get("courtName")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.");
  }

  const updated = await prisma.match.updateMany({
    where: {
      id: parsed.data.matchId,
      tournament: {
        arenaId: auth.arenaId
      }
    },
    data: {
      courtName: parsed.data.courtName
    }
  });

  if (!updated.count) {
    throw new Error("Jogo nÃ£o encontrado.");
  }

  await syncTvUpcomingMatchesFromTournament(auth.arenaId);
  refreshTournamentRoutes();
}

export async function updateMatchScheduleAction(formData: FormData) {
  const auth = await requireModuleEdit("matches");
  const parsed = updateMatchScheduleSchema.safeParse({
    matchId: formData.get("matchId"),
    scheduledTime: formData.get("scheduledTime")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.");
  }

  const updated = await prisma.match.updateMany({
    where: {
      id: parsed.data.matchId,
      tournament: {
        arenaId: auth.arenaId
      }
    },
    data: {
      scheduledTime: parsed.data.scheduledTime
    }
  });

  if (!updated.count) {
    throw new Error("Jogo nÃ£o encontrado.");
  }

  await syncTvUpcomingMatchesFromTournament(auth.arenaId);
  refreshTournamentRoutes();
}

export async function updateMatchResultAction(formData: FormData) {
  const auth = await requireModuleEdit("matches");
  const parsed = updateMatchResultSchema.safeParse({
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.");
  }

  await updateMatchResult(parsed.data.matchId, auth.arenaId, parsed.data.homeScore, parsed.data.awayScore);
  await syncTvUpcomingMatchesFromTournament(auth.arenaId);
  refreshTournamentRoutes();
}

export async function updateMatchParticipantsAction(formData: FormData) {
  const auth = await requireModuleEdit("matches");
  const parsed = updateMatchParticipantsSchema.safeParse({
    matchId: formData.get("matchId"),
    homePairId: formData.get("homePairId"),
    awayPairId: formData.get("awayPairId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos.");
  }

  await updateKnockoutParticipants(
    parsed.data.matchId,
    auth.arenaId,
    parsed.data.homePairId,
    parsed.data.awayPairId
  );

  await syncTvUpcomingMatchesFromTournament(auth.arenaId);
  refreshTournamentRoutes();
}



