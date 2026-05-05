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
  createTournamentPairSchema,
  deleteTournamentPairSchema,
  updateTournamentPairSchema
} from "@/lib/validators/pair";
import {
  updateMatchCourtSchema,
  updateMatchParticipantsSchema,
  updateMatchResultSchema,
  updateMatchScheduleSchema
} from "@/lib/validators/match";
import { createTournamentSchema } from "@/lib/validators/tournament";
import {
  createTournamentPair,
  deleteTournament,
  deleteTournamentPair,
  distributeTournamentGroups,
  finishTournament,
  generateTournamentMatches,
  generateTournamentPairs,
  syncTournamentEntries,
  updateKnockoutParticipants,
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

function getPrismaMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Já existe um jogador com esse nome na arena.";
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
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };
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
    return { error: getPrismaMessage(error, "Não foi possível cadastrar o jogador."), success: null };
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
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
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
      throw new Error("Jogador não encontrado.");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Jogador não encontrado.") {
      throw error;
    }

    throw new Error(getPrismaMessage(error, "Não foi possível atualizar o jogador."));
  }

  refreshTournamentRoutes();
}

export async function archivePlayerAction(formData: FormData) {
  const auth = await requireModuleEdit("players");
  const parsed = archivePlayerSchema.safeParse({
    playerId: formData.get("playerId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
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
    throw new Error("Jogador não encontrado.");
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
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
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
    throw new Error("Jogador não encontrado.");
  }

  refreshTournamentRoutes();
}

export async function updateTournamentEntryPointsAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = updateTournamentEntryPointsSchema.safeParse({
    entryId: formData.get("entryId"),
    points: formData.get("points")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
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
    throw new Error("Entrada do campeonato não encontrada.");
  }

  refreshTournamentRoutes();
}

export async function createTournamentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireModuleEdit("tournaments");
  const parsed = createTournamentSchema.safeParse({
    name: formData.get("name"),
    groupCount: formData.get("groupCount"),
    pairsPerGroup: formData.get("pairsPerGroup")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };
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

  await prisma.tournament.create({
    data: {
      arenaId: auth.arenaId,
      name: parsed.data.name,
      groupCount: parsed.data.groupCount,
      pairsPerGroup: parsed.data.pairsPerGroup
    }
  });

  refreshTournamentRoutes();
  return { error: null, success: "Torneio criado com sucesso." };
}

export async function finishTournamentAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio inválido.");
  }

  await finishTournament(tournamentId, auth.arenaId);
  refreshTournamentRoutes();
}

export async function deleteTournamentAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio inválido.");
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
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
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
      error: error instanceof Error ? error.message : "Não foi possível atualizar os participantes.",
      success: null
    };
  }
}

export async function generatePairsAction(formData: FormData) {
  await requireModuleEdit("pairs");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio inválido.");
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
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };
  }

  try {
    await createTournamentPair(parsed.data.tournamentId, parsed.data.playerAId, parsed.data.playerBId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Não foi possível salvar a dupla.",
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
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
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
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await deleteTournamentPair(parsed.data.pairId, auth.arenaId);
  refreshTournamentRoutes();
}

export async function generateGroupsAction(formData: FormData) {
  await requireModuleEdit("groups");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio inválido.");
  }

  await distributeTournamentGroups(tournamentId);
  refreshTournamentRoutes();
}

export async function generateMatchesAction(formData: FormData) {
  await requireModuleEdit("matches");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio inválido.");
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
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
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
    throw new Error("Jogo não encontrado.");
  }

  refreshTournamentRoutes();
}

export async function updateMatchScheduleAction(formData: FormData) {
  const auth = await requireModuleEdit("matches");
  const parsed = updateMatchScheduleSchema.safeParse({
    matchId: formData.get("matchId"),
    scheduledTime: formData.get("scheduledTime")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
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
    throw new Error("Jogo não encontrado.");
  }

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
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await updateMatchResult(parsed.data.matchId, auth.arenaId, parsed.data.homeScore, parsed.data.awayScore);
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
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await updateKnockoutParticipants(
    parsed.data.matchId,
    auth.arenaId,
    parsed.data.homePairId,
    parsed.data.awayPairId
  );

  refreshTournamentRoutes();
}
