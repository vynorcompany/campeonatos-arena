"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isPrismaUnknownFieldError } from "@/lib/prisma-errors";
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
  updateMatchManualStatusSchema,
  updateMatchTvVisibilitySchema,
  updateMatchParticipantsSchema,
  updateMatchResultSchema,
  updateMatchScheduleSchema
} from "@/lib/validators/match";
import { createTournamentSchema, updateTournamentSchema } from "@/lib/validators/tournament";
import { createManualTournamentRegistrationSchema } from "@/lib/validators/public-registration";
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
  tournamentId?: string;
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
  revalidatePath("/torneios/inscricoes");
}

const rankingRuleBlueprint = [
  { stageKey: "CHAMPION", label: "1º lugar", displayOrder: 1, field: "championPoints" as const },
  { stageKey: "RUNNER_UP", label: "2º lugar", displayOrder: 2, field: "runnerUpPoints" as const },
  { stageKey: "SEMIFINAL", label: "Semifinal", displayOrder: 3, field: "semifinalPoints" as const },
  { stageKey: "QUARTERFINAL", label: "Quartas de final", displayOrder: 4, field: "quarterfinalPoints" as const },
  { stageKey: "PARTICIPATION", label: "Participação", displayOrder: 5, field: "participationPoints" as const }
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
    throw new Error("Ranking inválido para esta arena.");
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
    return "Já existe um jogador com esse nome na arena.";
  }

  return fallback;
}

function parseCategoryList(raw: string) {
  const maybeJson = raw.trim();
  if (maybeJson.startsWith("[") || maybeJson.startsWith("{")) {
    const parsed = JSON.parse(maybeJson) as Array<{ name: string; groupCount?: number; pairsPerGroup?: number }>;
    const normalized = parsed
      .map((item) => ({
        name: String(item.name ?? "").trim(),
        groupCount: Number(item.groupCount ?? 4),
        pairsPerGroup: Number(item.pairsPerGroup ?? 3)
      }))
      .filter((item) => item.name.length > 0);

    if (!normalized.length) {
      throw new Error("Informe ao menos uma categoria.");
    }

    return normalized.map((item, index) => ({
      name: item.name,
      level: index + 1,
      groupCount: Number.isFinite(item.groupCount) ? Math.min(8, Math.max(1, Math.trunc(item.groupCount))) : 4,
      pairsPerGroup: Number.isFinite(item.pairsPerGroup) ? Math.min(16, Math.max(2, Math.trunc(item.pairsPerGroup))) : 3
    }));
  }

  const names = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!names.length) {
    throw new Error("Informe ao menos uma categoria.");
  }

  return names.map((name, index) => ({
    name,
    level: index + 1,
    groupCount: 4,
    pairsPerGroup: 3
  }));
}

function parseReaisToCents(input: unknown) {
  const normalized = String(input ?? "")
    .replace("R$", "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Valor monetário inválido.");
  }
  return Math.round(value * 100);
}

function normalizeCpf(input: string) {
  return input.replace(/\D/g, "");
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
    description: formData.get("description"),
    publicSlug: formData.get("publicSlug"),
    registrationPhase: formData.get("registrationPhase"),
    groupCount: formData.get("groupCount"),
    pairsPerGroup: formData.get("pairsPerGroup"),
    priceFirstCents: formData.get("priceFirstCents"),
    priceSecondCents: formData.get("priceSecondCents"),
    priceThirdCents: formData.get("priceThirdCents"),
    blockCategoryGap: formData.get("blockCategoryGap") === "on",
    maxCategoryGap: formData.get("maxCategoryGap"),
    categoryList: formData.get("categoryList"),
    rankingId: formData.get("rankingId")
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

  const rankingId = await ensureRankingBelongsToArena(auth.arenaId, parsed.data.rankingId || null);
  const priceFirstCents = parseReaisToCents(parsed.data.priceFirstCents);
  const priceSecondCents = parseReaisToCents(parsed.data.priceSecondCents);
  const priceThirdCents = parseReaisToCents(parsed.data.priceThirdCents);
  const categories = parseCategoryList(parsed.data.categoryList);
  const created = await prisma.tournament.create({
    data: {
      arenaId: auth.arenaId,
      name: parsed.data.name,
      description: parsed.data.description,
      publicSlug: parsed.data.publicSlug,
      registrationPhase: parsed.data.registrationPhase,
      groupCount: categories[0]?.groupCount ?? parsed.data.groupCount,
      pairsPerGroup: categories[0]?.pairsPerGroup ?? parsed.data.pairsPerGroup,
      priceFirstCents,
      priceSecondCents,
      priceThirdCents,
      blockCategoryGap: parsed.data.blockCategoryGap,
      maxCategoryGap: parsed.data.maxCategoryGap,
      rankingId,
      categories: {
        createMany: {
          data: categories
        }
      }
    }
  });

  refreshTournamentRoutes();
  return { error: null, success: "Torneio criado com sucesso.", tournamentId: created.id };
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

export async function updateTournamentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireModuleEdit("tournaments");
  const parsed = updateTournamentSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    name: formData.get("name"),
    description: formData.get("description"),
    publicSlug: formData.get("publicSlug"),
    registrationPhase: formData.get("registrationPhase"),
    groupCount: formData.get("groupCount"),
    pairsPerGroup: formData.get("pairsPerGroup"),
    priceFirstCents: formData.get("priceFirstCents"),
    priceSecondCents: formData.get("priceSecondCents"),
    priceThirdCents: formData.get("priceThirdCents"),
    blockCategoryGap: formData.get("blockCategoryGap") === "on",
    maxCategoryGap: formData.get("maxCategoryGap"),
    categoryList: formData.get("categoryList"),
    rankingId: formData.get("rankingId")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };
  }

  try {
    const rankingId = await ensureRankingBelongsToArena(auth.arenaId, parsed.data.rankingId || null);
    const priceFirstCents = parseReaisToCents(parsed.data.priceFirstCents);
    const priceSecondCents = parseReaisToCents(parsed.data.priceSecondCents);
    const priceThirdCents = parseReaisToCents(parsed.data.priceThirdCents);
    const categories = parseCategoryList(parsed.data.categoryList);
    await updateTournamentSettings(parsed.data.tournamentId, auth.arenaId, {
      name: parsed.data.name,
      description: parsed.data.description,
      publicSlug: parsed.data.publicSlug,
      registrationPhase: parsed.data.registrationPhase,
      groupCount: categories[0]?.groupCount ?? parsed.data.groupCount,
      pairsPerGroup: categories[0]?.pairsPerGroup ?? parsed.data.pairsPerGroup,
      priceFirstCents,
      priceSecondCents,
      priceThirdCents,
      blockCategoryGap: parsed.data.blockCategoryGap,
      maxCategoryGap: parsed.data.maxCategoryGap,
      categoryList: categories,
      rankingId
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Não foi possível atualizar o torneio.",
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
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
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
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
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
    throw new Error("Ranking não encontrado.");
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
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
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

export async function moveTournamentPairGroupAction(formData: FormData) {
  const auth = await requireModuleEdit("groups");
  const parsed = moveTournamentPairGroupSchema.safeParse({
    pairId: formData.get("pairId"),
    targetGroupId: formData.get("targetGroupId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await moveTournamentPairToGroup(parsed.data.pairId, parsed.data.targetGroupId, auth.arenaId);
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

export async function updateMatchManualStatusAction(formData: FormData) {
  const auth = await requireModuleEdit("matches");
  const parsed = updateMatchManualStatusSchema.safeParse({
    matchId: formData.get("matchId"),
    manualStatus: formData.get("manualStatus")
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
      manualStatus: parsed.data.manualStatus
    }
  });

  if (!updated.count) {
    throw new Error("Jogo nÃ£o encontrado.");
  }

  refreshTournamentRoutes();
}

export async function updateMatchTvVisibilityAction(formData: FormData) {
  const auth = await requireModuleEdit("matches");
  const parsed = updateMatchTvVisibilitySchema.safeParse({
    matchId: formData.get("matchId"),
    showOnTv: formData.get("showOnTv") === "on"
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  try {
    const updated = await prisma.match.updateMany({
      where: {
        id: parsed.data.matchId,
        tournament: {
          arenaId: auth.arenaId
        }
      },
      data: {
        showOnTv: parsed.data.showOnTv
      }
    });

    if (!updated.count) {
      throw new Error("Jogo não encontrado.");
    }
  } catch (error) {
    if (isPrismaUnknownFieldError(error, "showOnTv")) {
      throw new Error("Seu banco ainda não recebeu a atualização de exibição na TV dos jogos.");
    }

    throw error;
  }

  refreshTournamentRoutes();
  revalidatePath("/proximos-jogos/tv");
}

export async function updateTournamentRegistrationPhaseAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const registrationPhase = String(formData.get("registrationPhase") ?? "");
  const allowed = new Set(["REGISTRATIONS", "EDITING", "LIVE", "FINISHED"]);

  if (!tournamentId || !allowed.has(registrationPhase)) {
    throw new Error("Dados inválidos para atualização da fase.");
  }

  const updated = await prisma.tournament.updateMany({
    where: {
      id: tournamentId,
      arenaId: auth.arenaId
    },
    data: { registrationPhase }
  });

  if (!updated.count) {
    throw new Error("Torneio não encontrado.");
  }

  refreshTournamentRoutes();
  revalidatePath(`/torneios/${tournamentId}`);
}

function buildCategoryBracketSeeds(registrationIds: string[]) {
  if (registrationIds.length < 2) {
    throw new Error("É preciso ao menos 2 inscrições confirmadas para montar o chaveamento.");
  }

  const targetSize = 2 ** Math.ceil(Math.log2(registrationIds.length));
  const padded = [...registrationIds];
  while (padded.length < targetSize) {
    padded.push("");
  }

  const firstRound: Array<{ home: string | null; away: string | null }> = [];
  for (let i = 0; i < padded.length / 2; i += 1) {
    const home = padded[i] || null;
    const away = padded[padded.length - 1 - i] || null;
    firstRound.push({ home, away });
  }
  return firstRound;
}

export async function generateCategoryBracketAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");

  if (!tournamentId || !categoryId) {
    throw new Error("Torneio ou categoria inválidos.");
  }

  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, arenaId: auth.arenaId },
    select: { id: true }
  });
  if (!tournament) throw new Error("Torneio não encontrado.");

  const registrations = await prisma.publicTournamentRegistration.findMany({
    where: {
      tournamentId,
      categoryId,
      status: "CONFIRMED"
    },
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });

  const firstRoundSeeds = buildCategoryBracketSeeds(registrations.map((item) => item.id));
  await prisma.$transaction(async (tx) => {
    const bracket = await tx.categoryBracket.upsert({
      where: {
        tournamentId_categoryId: {
          tournamentId,
          categoryId
        }
      },
      create: {
        tournamentId,
        categoryId,
        status: "READY"
      },
      update: {
        status: "READY"
      }
    });

    await tx.categoryBracketMatch.deleteMany({
      where: { bracketId: bracket.id }
    });

    let roundOrder = 1;
    let roundSize = firstRoundSeeds.length;
    let roundIndex = 1;

    for (const seed of firstRoundSeeds) {
      await tx.categoryBracketMatch.create({
        data: {
          bracketId: bracket.id,
          stage: "ROUND_1",
          label: `R1 - Jogo ${roundOrder}`,
          roundOrder,
          homeRegistrationId: seed.home,
          awayRegistrationId: seed.away
        }
      });
      roundOrder += 1;
    }

    while (roundSize > 1) {
      const next = roundSize / 2;
      roundIndex += 1;
      for (let i = 1; i <= next; i += 1) {
        await tx.categoryBracketMatch.create({
          data: {
            bracketId: bracket.id,
            stage: next === 1 ? "FINAL" : `ROUND_${roundIndex}`,
            label: next === 1 ? "Final" : `R${roundIndex} - Jogo ${i}`,
            roundOrder
          }
        });
        roundOrder += 1;
      }
      roundSize = next;
    }
  });

  refreshTournamentRoutes();
}

export async function updateCategoryBracketMatchScheduleAction(formData: FormData) {
  await requireModuleEdit("matches");
  const matchId = String(formData.get("matchId") ?? "");
  const scheduledTime = String(formData.get("scheduledTime") ?? "");
  const courtName = String(formData.get("courtName") ?? "");
  if (!matchId) throw new Error("Jogo inválido.");

  await prisma.categoryBracketMatch.update({
    where: { id: matchId },
    data: {
      scheduledTime,
      courtName
    }
  });
  revalidatePath("/torneios/inscricoes");
}

export async function updateTournamentCategoryFormatAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const groupCount = Number(formData.get("groupCount") ?? 0);
  const pairsPerGroup = Number(formData.get("pairsPerGroup") ?? 0);

  if (!tournamentId || !categoryId || !Number.isFinite(groupCount) || !Number.isFinite(pairsPerGroup)) {
    throw new Error("Dados inválidos para formato da categoria.");
  }

  await prisma.tournamentCategory.updateMany({
    where: {
      id: categoryId,
      tournamentId,
      tournament: {
        arenaId: auth.arenaId
      }
    },
    data: {
      groupCount: Math.min(8, Math.max(1, Math.trunc(groupCount))),
      pairsPerGroup: Math.min(16, Math.max(2, Math.trunc(pairsPerGroup)))
    }
  });

  revalidatePath("/torneios/inscricoes");
  revalidatePath(`/torneios/${tournamentId}`);
}

export async function createManualTournamentRegistrationAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireModuleEdit("tournaments");
  const parsed = createManualTournamentRegistrationSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    categoryId: formData.get("categoryId"),
    leadName: formData.get("leadName"),
    leadPhone: formData.get("leadPhone"),
    leadCpf: normalizeCpf(String(formData.get("leadCpf") ?? "")),
    leadBirthDate: formData.get("leadBirthDate"),
    partnerName: formData.get("partnerName"),
    partnerPhone: formData.get("partnerPhone"),
    partnerCpf: normalizeCpf(String(formData.get("partnerCpf") ?? "")),
    partnerBirthDate: formData.get("partnerBirthDate"),
    amountReais: formData.get("amountReais"),
    paymentStatus: formData.get("paymentStatus")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };
  }

  const tournament = await prisma.tournament.findFirst({
    where: {
      id: parsed.data.tournamentId,
      arenaId: auth.arenaId
    },
    select: {
      id: true,
      categories: {
        where: { active: true },
        select: { id: true }
      }
    }
  });

  if (!tournament) {
    return { error: "Torneio não encontrado.", success: null };
  }

  if (!tournament.categories.some((category) => category.id === parsed.data.categoryId)) {
    return { error: "Categoria inválida para este torneio.", success: null };
  }

  const registrationCount = await prisma.publicTournamentRegistration.count({
    where: {
      tournamentId: tournament.id
    }
  });

  const amountCents = parseReaisToCents(parsed.data.amountReais);

  await prisma.publicTournamentRegistration.create({
    data: {
      tournamentId: tournament.id,
      categoryId: parsed.data.categoryId,
      leadName: parsed.data.leadName,
      leadPhone: parsed.data.leadPhone,
      leadCpf: parsed.data.leadCpf,
      leadBirthDate: parsed.data.leadBirthDate,
      partnerName: parsed.data.partnerName,
      partnerPhone: parsed.data.partnerPhone,
      partnerCpf: parsed.data.partnerCpf,
      partnerBirthDate: parsed.data.partnerBirthDate,
      registrationOrder: registrationCount + 1,
      amountCents,
      paymentStatus: parsed.data.paymentStatus,
      status: parsed.data.paymentStatus === "PAID" ? "CONFIRMED" : "PENDING_PAYMENT",
      paymentProvider: "MANUAL",
      paymentReference: ""
    }
  });

  refreshTournamentRoutes();
  revalidatePath(`/torneios/${parsed.data.tournamentId}`);
  return { error: null, success: "Inscrição manual criada com sucesso." };
}

export async function deleteTournamentRegistrationAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const registrationId = String(formData.get("registrationId") ?? "");

  if (!registrationId) {
    throw new Error("Inscricao invalida.");
  }

  const deleted = await prisma.publicTournamentRegistration.deleteMany({
    where: {
      id: registrationId,
      tournament: {
        arenaId: auth.arenaId
      }
    }
  });

  if (!deleted.count) {
    throw new Error("Inscricao nao encontrada.");
  }

  refreshTournamentRoutes();
}




