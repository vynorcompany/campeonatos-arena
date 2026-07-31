"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveRankingPeriod } from "@/lib/ranking/period";
import { isPrismaUnknownFieldError } from "@/lib/prisma-errors";
import { getAthleteDeletionRestriction } from "@/lib/athlete-management";
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
  createRankingCycleSchema,
  createRankingProfileSchema,
  deleteRankingProfileSchema,
  getRankingRuleBlueprint,
  updateRankingConfigurationSchema,
  updateRankingPointsSchema,
  updateRankingProfileSchema
} from "@/lib/validators/ranking";
import {
  createTournamentPairSchema,
  deleteTournamentPairSchema,
  moveTournamentPairGroupSchema,
  updateTournamentPairPointsSchema,
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
import {
  createTournamentSchema,
  updateTournamentEventSchema,
  updateTournamentSchema,
} from "@/lib/validators/tournament";
import { createManualTournamentRegistrationSchema, updateManualTournamentRegistrationSchema } from "@/lib/validators/public-registration";
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
  reopenTournament,
  syncTournamentEntries,
  updateKnockoutParticipants,
  updateTournamentSettings,
  updateTournamentPair,
  updateTournamentPairPoints,
  updateMatchResult
} from "@/lib/services/tournament";
import { ensureTournamentPairFromRegistration } from "@/lib/services/registration-pair";

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

async function runRankingSerializableTransaction<T>(
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

  throw new Error("Não foi possível serializar a atualização do ranking.");
}

async function lockRankingProfile(
  tx: Prisma.TransactionClient,
  rankingId: string,
) {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext(${rankingId}))
  `;
}

async function ensureGeneralRankingAvailable(
  tx: Prisma.TransactionClient,
  arenaId: string,
  rankingId: string | null,
  isGeneral: boolean,
) {
  if (!isGeneral) {
    return;
  }

  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext(${`general-ranking:${arenaId}`}))
  `;

  const existingGeneral = await tx.rankingProfile.findFirst({
    where: {
      arenaId,
      isGeneral: true,
      ...(rankingId ? { id: { not: rankingId } } : {}),
    },
    select: { id: true },
  });

  if (existingGeneral) {
    throw new Error("A arena já possui um Ranking Geral.");
  }
}

async function ensureRankingBelongsToArena(
  tx: Prisma.TransactionClient,
  arenaId: string,
  rankingId: string | null,
) {
  if (!rankingId) {
    return null;
  }

  await lockRankingProfile(tx, rankingId);
  const ranking = await tx.rankingProfile.findFirst({
    where: {
      id: rankingId,
      arenaId,
      type: "INDIVIDUAL",
      model: "KNOCKOUT",
    },
    select: {
      id: true
    }
  });

  if (!ranking) {
    throw new Error("Ranking individual inválido para esta arena.");
  }

  return ranking.id;
}

async function syncRankingRules(
  tx: Prisma.TransactionClient,
  rankingId: string,
  values: {
    model: "LEAGUE" | "KNOCKOUT";
    championPoints?: number;
    runnerUpPoints?: number;
    thirdPoints?: number;
    semifinalPoints?: number;
    quarterfinalPoints?: number;
    participationPoints?: number;
  }
) {
  const rankingRuleBlueprint = getRankingRuleBlueprint(values.model);
  const stageKeys = rankingRuleBlueprint.map((rule) => rule.stageKey);

  await tx.rankingRule.deleteMany({
    where: {
      rankingId,
      stageKey: { notIn: stageKeys },
    },
  });

  await Promise.all(
    rankingRuleBlueprint.map((rule) => {
      const points = values[rule.field];
      if (points === undefined) {
        throw new Error(`Pontuação ausente para ${rule.label}.`);
      }

      return tx.rankingRule.upsert({
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
          points,
          displayOrder: rule.displayOrder
        },
        update: {
          label: rule.label,
          points,
          displayOrder: rule.displayOrder
        }
      });
    })
  );
}

function getPrismaMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Já existe um jogador com esse nome na arena.";
  }

  return fallback;
}

async function getRankingUpdateError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return "Já existe um ranking com este nome na arena.";
  }

  return error instanceof Error
    ? error.message
    : "Não foi possível atualizar o ranking.";
}

export type RankingActionState = {
  error: string | null;
  success: string | null;
};

function parseCategoryList(raw: string, fallbackPriceSecondCents: number, fallbackPriceThirdCents: number) {
  const maybeJson = raw.trim();
  if (maybeJson.startsWith("[") || maybeJson.startsWith("{")) {
    const parsed = JSON.parse(maybeJson) as Array<{
      name: string;
      groupCount?: number;
      pairsPerGroup?: number;
      priceSecondCents?: number | string;
      priceThirdCents?: number | string;
    }>;
    const normalized = parsed
      .map((item) => ({
        name: String(item.name ?? "").trim(),
        groupCount: Number(item.groupCount ?? 4),
        pairsPerGroup: Number(item.pairsPerGroup ?? 3),
        priceSecondCents:
          item.priceSecondCents === undefined
            ? fallbackPriceSecondCents
            : parseReaisToCents(item.priceSecondCents),
        priceThirdCents:
          item.priceThirdCents === undefined
            ? fallbackPriceThirdCents
            : parseReaisToCents(item.priceThirdCents)
      }))
      .filter((item) => item.name.length > 0);

    if (!normalized.length) {
      throw new Error("Informe ao menos uma categoria.");
    }

    return normalized.map((item, index) => ({
      name: item.name,
      level: index + 1,
      groupCount: Number.isFinite(item.groupCount) ? Math.min(8, Math.max(1, Math.trunc(item.groupCount))) : 4,
      pairsPerGroup: Number.isFinite(item.pairsPerGroup) ? Math.min(16, Math.max(2, Math.trunc(item.pairsPerGroup))) : 3,
      priceSecondCents: Number.isFinite(item.priceSecondCents) ? Math.max(0, Math.trunc(item.priceSecondCents)) : fallbackPriceSecondCents,
      priceThirdCents: Number.isFinite(item.priceThirdCents) ? Math.max(0, Math.trunc(item.priceThirdCents)) : fallbackPriceThirdCents
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
    pairsPerGroup: 3,
    priceSecondCents: fallbackPriceSecondCents,
    priceThirdCents: fallbackPriceThirdCents
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

function normalizeDateInput(input: unknown) {
  const value = String(input ?? "").trim();
  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month}-${day}`;
  }
  return value;
}


export async function createPlayerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireModuleEdit("players");
  const parsed = createPlayerSchema.safeParse({
    name: formData.get("name"),
    points: formData.get("points"),
    class: formData.get("class"),
    gender: formData.get("gender"),
    phone: formData.get("phone"),
    cpf: normalizeCpf(String(formData.get("cpf") ?? "")),
    birthDate: formData.get("birthDate")
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
          class: parsed.data.class,
          gender: parsed.data.gender,
          phone: parsed.data.phone,
          cpf: parsed.data.cpf,
          birthDate: parsed.data.birthDate,
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
    points: formData.get("points"),
    class: formData.get("class"),
    gender: formData.get("gender"),
    phone: formData.get("phone"),
    cpf: normalizeCpf(String(formData.get("cpf") ?? "")),
    birthDate: formData.get("birthDate")
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
        class: parsed.data.class,
        gender: parsed.data.gender,
        phone: parsed.data.phone,
        cpf: parsed.data.cpf,
        birthDate: parsed.data.birthDate,
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

export async function deleteAthleteAction(formData: FormData) {
  const auth = await requireModuleEdit("players");
  const parsed = archivePlayerSchema.safeParse({
    playerId: formData.get("playerId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const athlete = await prisma.player.findFirst({
    where: {
      id: parsed.data.playerId,
      arenaId: auth.arenaId
    },
    select: {
      id: true,
      _count: {
        select: {
          entries: true,
          pairPlayers: true,
          categoryPairPlayers: true
        }
      }
    }
  });

  if (!athlete) {
    throw new Error("Atleta não encontrado.");
  }

  const restriction = getAthleteDeletionRestriction({
    tournamentEntries: athlete._count.entries,
    pairAppearances: athlete._count.pairPlayers,
    categoryPairAppearances: athlete._count.categoryPairPlayers
  });

  if (restriction) {
    throw new Error(restriction);
  }

  await prisma.player.delete({
    where: {
      id: athlete.id
    }
  });

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
    creationMode: formData.get("creationMode"),
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

  const priceFirstCents = parseReaisToCents(parsed.data.priceFirstCents);
  const priceSecondCents = parseReaisToCents(parsed.data.priceSecondCents);
  const priceThirdCents = parseReaisToCents(parsed.data.priceThirdCents);
  const categories = parsed.data.categoryList
    ? parseCategoryList(parsed.data.categoryList, priceSecondCents, priceThirdCents)
    : [];
  const created = await runRankingSerializableTransaction(async (tx) => {
    const rankingId = await ensureRankingBelongsToArena(
      tx,
      auth.arenaId,
      parsed.data.rankingId || null,
    );
    return tx.tournament.create({
      data: {
        arenaId: auth.arenaId,
        name: parsed.data.name,
        description: parsed.data.description,
        publicSlug: parsed.data.publicSlug,
        creationMode: parsed.data.creationMode,
        registrationPhase: parsed.data.registrationPhase,
        groupCount: categories[0]?.groupCount ?? parsed.data.groupCount,
        pairsPerGroup: categories[0]?.pairsPerGroup ?? parsed.data.pairsPerGroup,
        priceFirstCents,
        priceSecondCents,
        priceThirdCents,
        blockCategoryGap: parsed.data.blockCategoryGap,
        maxCategoryGap: parsed.data.maxCategoryGap,
        rankingId,
        ...(categories.length
          ? {
              categories: {
                createMany: {
                  data: categories
                }
              }
            }
          : {})
      }
    });
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

export async function reopenTournamentAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio inválido.");
  }

  await reopenTournament(tournamentId, auth.arenaId);
  refreshTournamentRoutes();
  revalidatePath(`/torneios/${tournamentId}`);
}

export async function updateTournamentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireModuleEdit("tournaments");

  if (!formData.has("publicSlug")) {
    const eventParsed = updateTournamentEventSchema.safeParse({
      tournamentId: formData.get("tournamentId"),
      name: formData.get("name"),
      description: formData.get("description"),
    });

    if (!eventParsed.success) {
      return {
        error: eventParsed.error.issues[0]?.message ?? "Dados inválidos.",
        success: null,
      };
    }

    const updated = await prisma.tournament.updateMany({
      where: {
        id: eventParsed.data.tournamentId,
        arenaId: auth.arenaId,
      },
      data: {
        name: eventParsed.data.name,
        description: eventParsed.data.description,
      },
    });

    if (!updated.count) {
      return { error: "Evento não encontrado.", success: null };
    }

    refreshTournamentRoutes();
    revalidatePath(`/torneios/${eventParsed.data.tournamentId}`);
    return { error: null, success: "Evento atualizado com sucesso." };
  }

  const parsed = updateTournamentSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    creationMode: formData.get("creationMode"),
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
    const priceFirstCents = parseReaisToCents(parsed.data.priceFirstCents);
    const priceSecondCents = parseReaisToCents(parsed.data.priceSecondCents);
    const priceThirdCents = parseReaisToCents(parsed.data.priceThirdCents);
    const categories = parseCategoryList(parsed.data.categoryList, priceSecondCents, priceThirdCents);
    await updateTournamentSettings(parsed.data.tournamentId, auth.arenaId, {
      name: parsed.data.name,
      description: parsed.data.description,
      publicSlug: parsed.data.publicSlug,
      creationMode: parsed.data.creationMode,
      registrationPhase: parsed.data.registrationPhase,
      groupCount: categories[0]?.groupCount ?? parsed.data.groupCount,
      pairsPerGroup: categories[0]?.pairsPerGroup ?? parsed.data.pairsPerGroup,
      priceFirstCents,
      priceSecondCents,
      priceThirdCents,
      blockCategoryGap: parsed.data.blockCategoryGap,
      maxCategoryGap: parsed.data.maxCategoryGap,
      categoryList: categories,
      rankingId: parsed.data.rankingId || null
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Não foi possível atualizar o torneio.",
      success: null
    };
  }

  refreshTournamentRoutes();
  revalidatePath(`/torneios/${parsed.data.tournamentId}`);
  return { error: null, success: "Torneio atualizado com sucesso." };
}

export async function createRankingProfileAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = createRankingProfileSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    type: formData.get("type"),
    model: formData.get("model"),
    isGeneral: formData.get("isGeneral") === "on",
    feedsGeneralRanking: formData.get("feedsGeneralRanking") === "on",
    championPoints: formData.get("championPoints") ?? 200,
    runnerUpPoints: formData.get("runnerUpPoints") ?? 140,
    thirdPoints: formData.get("thirdPoints") ?? 90,
    semifinalPoints: formData.get("semifinalPoints") ?? 90,
    quarterfinalPoints: formData.get("quarterfinalPoints") ?? 50,
    participationPoints: formData.get("participationPoints") ?? 20
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const rankingId = await runRankingSerializableTransaction(async (tx) => {
    await ensureGeneralRankingAvailable(
      tx,
      auth.arenaId,
      null,
      parsed.data.isGeneral,
    );
    const ranking = await tx.rankingProfile.create({
      data: {
        arenaId: auth.arenaId,
        name: parsed.data.name,
        description: parsed.data.description,
        type: parsed.data.type,
        model: parsed.data.model,
        isGeneral: parsed.data.isGeneral,
        feedsGeneralRanking: parsed.data.feedsGeneralRanking,
      }
    });

    await tx.rankingCycle.create({
      data: {
        rankingId: ranking.id,
        label: "Ciclo 1",
        startedAt: ranking.createdAt
      }
    });
    await syncRankingRules(tx, ranking.id, parsed.data);
    return ranking.id;
  });
  refreshTournamentRoutes();
  return rankingId;
}

export async function updateRankingProfileAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = updateRankingProfileSchema.safeParse({
    rankingId: formData.get("rankingId"),
    name: formData.get("name"),
    description: formData.get("description"),
    type: formData.get("type"),
    model: formData.get("model"),
    isGeneral: formData.get("isGeneral") === "on",
    feedsGeneralRanking: formData.get("feedsGeneralRanking") === "on",
    championPoints: formData.get("championPoints"),
    runnerUpPoints: formData.get("runnerUpPoints"),
    thirdPoints: formData.get("thirdPoints"),
    semifinalPoints: formData.get("semifinalPoints"),
    quarterfinalPoints: formData.get("quarterfinalPoints"),
    participationPoints: formData.get("participationPoints")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await runRankingSerializableTransaction(async (tx) => {
    await lockRankingProfile(tx, parsed.data.rankingId);
    const currentRanking = await tx.rankingProfile.findFirst({
      where: {
        id: parsed.data.rankingId,
        arenaId: auth.arenaId,
      },
      select: { type: true, model: true },
    });

    if (!currentRanking) {
      throw new Error("Ranking não encontrado.");
    }

    const startedCategoryCompetitionCount = await tx.categoryCompetition.count({
      where: {
        rankingId: parsed.data.rankingId,
        category: { tournament: { arenaId: auth.arenaId } },
        status: { not: "DRAFT" },
      },
    });

    if (
      startedCategoryCompetitionCount &&
      (currentRanking.type !== parsed.data.type ||
        currentRanking.model !== parsed.data.model)
    ) {
      throw new Error(
        "Não pode alterar o tipo ou o modelo depois que uma competição de categoria começa.",
      );
    }

    await ensureGeneralRankingAvailable(
      tx,
      auth.arenaId,
      parsed.data.rankingId,
      parsed.data.isGeneral,
    );

    if (parsed.data.type === "INDIVIDUAL") {
      const linkedCategoryCount = await tx.categoryCompetition.count({
        where: {
          rankingId: parsed.data.rankingId,
          category: {
            tournament: {
              arenaId: auth.arenaId
            }
          }
        }
      });

      if (linkedCategoryCount) {
        throw new Error("Um ranking vinculado a categorias de duplas não pode se tornar individual.");
      }
    }

    const linkedLegacyTournamentCount = await tx.tournament.count({
      where: {
        arenaId: auth.arenaId,
        rankingId: parsed.data.rankingId,
      },
    });

    if (parsed.data.type === "PAIR") {
      if (linkedLegacyTournamentCount) {
        throw new Error("Um ranking vinculado a torneios legados não pode se tornar ranking de duplas.");
      }
    }

    if (
      parsed.data.model === "LEAGUE" &&
      linkedLegacyTournamentCount
    ) {
      throw new Error(
        "O ranking precisa permanecer no modelo Mata-mata enquanto houver torneios vinculados.",
      );
    }

    const linkedIncompatibleCategoryCount =
      await tx.categoryCompetition.count({
        where: {
          rankingId: parsed.data.rankingId,
          category: {
            tournament: {
              arenaId: auth.arenaId,
            },
          },
          ...(parsed.data.model === "LEAGUE"
            ? { format: { not: "LEAGUE" } }
            : { format: "LEAGUE" }),
        },
      });

    if (linkedIncompatibleCategoryCount) {
      throw new Error(
        "O modelo do ranking não é compatível com as categorias vinculadas.",
      );
    }

    const updated = await tx.rankingProfile.updateMany({
      where: {
        id: parsed.data.rankingId,
        arenaId: auth.arenaId
      },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        type: parsed.data.type,
        model: parsed.data.model,
        isGeneral: parsed.data.isGeneral,
        feedsGeneralRanking: parsed.data.feedsGeneralRanking,
      }
    });

    if (!updated.count) {
      throw new Error("Ranking não encontrado.");
    }

    await syncRankingRules(tx, parsed.data.rankingId, parsed.data);
  });
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
  revalidatePath(`/torneios/rankings/${parsed.data.rankingId}`);
}

export async function updateRankingPointsAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = updateRankingPointsSchema.safeParse({
    rankingId: formData.get("rankingId"),
    championPoints: formData.get("championPoints"),
    runnerUpPoints: formData.get("runnerUpPoints"),
    thirdPoints: formData.get("thirdPoints"),
    semifinalPoints: formData.get("semifinalPoints"),
    quarterfinalPoints: formData.get("quarterfinalPoints"),
    participationPoints: formData.get("participationPoints"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await runRankingSerializableTransaction(async (tx) => {
    await lockRankingProfile(tx, parsed.data.rankingId);
    const ranking = await tx.rankingProfile.findFirst({
      where: {
        id: parsed.data.rankingId,
        arenaId: auth.arenaId,
      },
      select: { id: true, model: true },
    });

    if (!ranking) {
      throw new Error("Ranking não encontrado.");
    }

    const values = { model: ranking.model, ...parsed.data };
    for (const rule of getRankingRuleBlueprint(ranking.model)) {
      if (values[rule.field] === undefined) {
        throw new Error(`Informe os pontos para ${rule.label}.`);
      }
    }

    await syncRankingRules(tx, ranking.id, values);
  });

  const linkedTournaments = await prisma.tournament.findMany({
    where: {
      arenaId: auth.arenaId,
      rankingId: parsed.data.rankingId,
      status: { not: "FINISHED" },
    },
    select: { id: true },
  });
  await Promise.all(
    linkedTournaments.map((tournament) =>
      recalculateTournamentRankingPoints(tournament.id),
    ),
  );

  refreshTournamentRoutes();
  revalidatePath(`/torneios/rankings/${parsed.data.rankingId}`);
}

export async function updateRankingConfigurationAction(
  _: RankingActionState,
  formData: FormData,
): Promise<RankingActionState> {
  const auth = await requireModuleEdit("tournaments");
  const parsed = updateRankingConfigurationSchema.safeParse({
    rankingId: formData.get("rankingId"),
    name: formData.get("name"),
    description: formData.get("description"),
    type: formData.get("type") || undefined,
    model: formData.get("model") || undefined,
    isGeneral: formData.has("generalSettingsPresent")
      ? formData.get("isGeneral") === "on"
      : undefined,
    feedsGeneralRanking: formData.has("generalSettingsPresent")
      ? formData.get("feedsGeneralRanking") === "on"
      : undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      success: null,
    };
  }

  try {
    await runRankingSerializableTransaction(async (tx) => {
      await lockRankingProfile(tx, parsed.data.rankingId);
      const currentRanking = await tx.rankingProfile.findFirst({
        where: {
          id: parsed.data.rankingId,
          arenaId: auth.arenaId,
        },
        select: {
          type: true,
          model: true,
          isGeneral: true,
          feedsGeneralRanking: true,
          rules: { select: { stageKey: true, points: true } },
        },
      });

      if (!currentRanking) {
        throw new Error("Ranking não encontrado.");
      }

      const nextType = parsed.data.type ?? currentRanking.type;
      const nextModel = parsed.data.model ?? currentRanking.model;
      const nextIsGeneral = parsed.data.isGeneral ?? currentRanking.isGeneral;
      const nextFeedsGeneral =
        parsed.data.feedsGeneralRanking ?? currentRanking.feedsGeneralRanking;

      if (nextIsGeneral && nextType !== "INDIVIDUAL") {
        throw new Error("O Ranking Geral precisa ser individual.");
      }
      if (nextFeedsGeneral && nextType !== "PAIR") {
        throw new Error(
          "Apenas um ranking de duplas pode alimentar o Ranking Geral.",
        );
      }

      const startedCategoryCompetitionCount =
        await tx.categoryCompetition.count({
          where: {
            rankingId: parsed.data.rankingId,
            category: { tournament: { arenaId: auth.arenaId } },
            status: { not: "DRAFT" },
          },
        });

      if (
        startedCategoryCompetitionCount &&
        (currentRanking.type !== nextType || currentRanking.model !== nextModel)
      ) {
        throw new Error(
          "Não pode alterar o tipo ou o modelo depois que uma competição de categoria começa.",
        );
      }

      await ensureGeneralRankingAvailable(
        tx,
        auth.arenaId,
        parsed.data.rankingId,
        nextIsGeneral,
      );

      const linkedCategoryCount = await tx.categoryCompetition.count({
        where: {
          rankingId: parsed.data.rankingId,
          category: { tournament: { arenaId: auth.arenaId } },
        },
      });
      if (nextType === "INDIVIDUAL" && linkedCategoryCount) {
        throw new Error(
          "Um ranking vinculado a categorias de duplas não pode se tornar individual.",
        );
      }

      const linkedLegacyTournamentCount = await tx.tournament.count({
        where: { arenaId: auth.arenaId, rankingId: parsed.data.rankingId },
      });
      if (nextType === "PAIR" && linkedLegacyTournamentCount) {
        throw new Error(
          "Um ranking vinculado a torneios legados não pode se tornar ranking de duplas.",
        );
      }
      if (nextModel === "LEAGUE" && linkedLegacyTournamentCount) {
        throw new Error(
          "O ranking precisa permanecer no modelo Mata-mata enquanto houver torneios vinculados.",
        );
      }

      const linkedIncompatibleCategoryCount =
        await tx.categoryCompetition.count({
          where: {
            rankingId: parsed.data.rankingId,
            category: { tournament: { arenaId: auth.arenaId } },
            ...(nextModel === "LEAGUE"
              ? { format: { not: "LEAGUE" } }
              : { format: "LEAGUE" }),
          },
        });
      if (linkedIncompatibleCategoryCount) {
        throw new Error(
          "O modelo do ranking não é compatível com as categorias vinculadas.",
        );
      }

      const updated = await tx.rankingProfile.updateMany({
        where: {
          id: parsed.data.rankingId,
          arenaId: auth.arenaId,
        },
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          type: nextType,
          model: nextModel,
          isGeneral: nextIsGeneral,
          feedsGeneralRanking: nextFeedsGeneral,
        },
      });

      if (!updated.count) {
        throw new Error("Ranking não encontrado.");
      }

      if (nextModel !== currentRanking.model) {
        const currentPoints = new Map(
          currentRanking.rules.map((rule) => [rule.stageKey, rule.points]),
        );
        await syncRankingRules(tx, parsed.data.rankingId, {
          model: nextModel,
          championPoints: currentPoints.get("CHAMPION") ?? 200,
          runnerUpPoints: currentPoints.get("RUNNER_UP") ?? 140,
          thirdPoints:
            currentPoints.get("THIRD") ?? currentPoints.get("SEMIFINAL") ?? 90,
          semifinalPoints:
            currentPoints.get("SEMIFINAL") ?? currentPoints.get("THIRD") ?? 90,
          quarterfinalPoints: currentPoints.get("QUARTERFINAL") ?? 50,
          participationPoints: currentPoints.get("PARTICIPATION") ?? 20,
        });
      }
    });
  } catch (error) {
    return { error: await getRankingUpdateError(error), success: null };
  }

  refreshTournamentRoutes();
  revalidatePath(`/torneios/rankings/${parsed.data.rankingId}`);
  return { error: null, success: "Configuração salva com sucesso." };
}

export async function resetRankingPointsAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const rankingId = String(formData.get("rankingId") ?? "");

  if (!rankingId) {
    throw new Error("Ranking inválido.");
  }

  const ranking = await prisma.rankingProfile.findFirst({
    where: {
      id: rankingId,
      arenaId: auth.arenaId
    },
    select: {
      id: true,
      createdAt: true
    }
  });

  if (!ranking) {
    throw new Error("Ranking não encontrado.");
  }

  const currentCycle = await prisma.rankingCycle.findFirst({
    where: {
      rankingId: ranking.id,
      endedAt: null
    },
    orderBy: {
      startedAt: "desc"
    },
    select: {
      id: true
    }
  });

  const existingCycleCount = await prisma.rankingCycle.count({
    where: {
      rankingId: ranking.id
    }
  });

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    if (currentCycle) {
      await tx.rankingCycle.update({
        where: {
          id: currentCycle.id
        },
        data: {
          endedAt: now
        }
      });
    } else if (!existingCycleCount) {
      await tx.rankingCycle.create({
        data: {
          rankingId: ranking.id,
          label: "Ciclo 1",
          startedAt: ranking.createdAt,
          endedAt: now
        }
      });
    }

    const cycleCount = await tx.rankingCycle.count({
      where: {
        rankingId: ranking.id
      }
    });

    await tx.rankingCycle.create({
      data: {
        rankingId: ranking.id,
        label: `Ciclo ${cycleCount + 1}`,
        startedAt: now
      }
    });
  });

  refreshTournamentRoutes();
  revalidatePath(`/torneios/rankings/${ranking.id}`);
}

export async function createRankingCycleAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = createRankingCycleSchema.safeParse({
    rankingId: formData.get("rankingId"),
    label: formData.get("label"),
    startedAt: formData.get("startedAt"),
    endedAt: formData.get("endedAt"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const ranking = await prisma.rankingProfile.findFirst({
    where: { id: parsed.data.rankingId, arenaId: auth.arenaId },
    select: { id: true },
  });
  if (!ranking) throw new Error("Ranking não encontrado.");

  const resolvedDates = resolveRankingPeriod({
    period: "custom",
    start: parsed.data.startedAt,
    end: parsed.data.endedAt ?? parsed.data.startedAt,
  }, []);
  if (resolvedDates.error) throw new Error(resolvedDates.error);
  const startedAt = resolvedDates.start;
  const endedAt = parsed.data.endedAt && resolvedDates.endExclusive
    ? new Date(resolvedDates.endExclusive.getTime() - 1)
    : null;

  await prisma.rankingCycle.create({
    data: {
      rankingId: ranking.id,
      label: parsed.data.label,
      startedAt,
      endedAt,
    },
  });

  revalidatePath(`/torneios/rankings/${ranking.id}`);
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

export async function updateTournamentPairPointsAction(formData: FormData) {
  const auth = await requireModuleEdit("pairs");
  const parsed = updateTournamentPairPointsSchema.safeParse({
    pairId: formData.get("pairId"),
    totalPoints: formData.get("totalPoints")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await updateTournamentPairPoints(parsed.data.pairId, auth.arenaId, parsed.data.totalPoints);
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

export async function updateTournamentStatusAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const status = String(formData.get("status") ?? "");
  const allowed = new Set(["DRAFT", "READY_FOR_DRAW", "GROUPS_DEFINED", "MATCHES_DEFINED", "FINISHED"]);

  if (!tournamentId || !allowed.has(status)) {
    throw new Error("Dados invalidos para atualizacao do status.");
  }

  const updated = await prisma.tournament.updateMany({
    where: {
      id: tournamentId,
      arenaId: auth.arenaId
    },
    data: { status }
  });

  if (!updated.count) {
    throw new Error("Torneio nao encontrado.");
  }

  refreshTournamentRoutes();
  revalidatePath(`/torneios/${tournamentId}`);
}

export async function createManualTournamentRegistrationAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireModuleEdit("tournaments");
  const parsed = createManualTournamentRegistrationSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    categoryId: formData.get("categoryId"),
    leadPlayerId: formData.get("leadPlayerId"),
    partnerPlayerId: formData.get("partnerPlayerId"),
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

  if (parsed.data.leadPlayerId === parsed.data.partnerPlayerId) {
    return { error: "Os atletas da dupla devem ser diferentes.", success: null };
  }

  const athletes = await prisma.player.findMany({
    where: { arenaId: auth.arenaId, active: true, id: { in: [parsed.data.leadPlayerId, parsed.data.partnerPlayerId] } },
    select: { id: true, name: true, phone: true, cpf: true, birthDate: true }
  });
  if (athletes.length !== 2 || athletes.some((athlete) => !athlete.phone || !/^\d{11}$/.test(athlete.cpf) || !athlete.birthDate)) {
    return { error: "Atleta não encontrado, inativo ou sem cadastro completo.", success: null };
  }
  const athletesById = new Map(athletes.map((athlete) => [athlete.id, athlete]));
  const lead = athletesById.get(parsed.data.leadPlayerId);
  const partner = athletesById.get(parsed.data.partnerPlayerId);
  if (!lead || !partner || !lead.birthDate || !partner.birthDate) {
    return { error: "Atleta não encontrado, inativo ou sem cadastro completo.", success: null };
  }

  const leadBirthDate = lead.birthDate;
  const partnerBirthDate = partner.birthDate;

  const registrationCount = await prisma.publicTournamentRegistration.count({
    where: {
      tournamentId: tournament.id
    }
  });

  const amountCents = parseReaisToCents(parsed.data.amountReais);

  await prisma.$transaction(async (tx) => {
    await tx.publicTournamentRegistration.create({
      data: {
        tournamentId: tournament.id,
        categoryId: parsed.data.categoryId,
        leadName: lead.name,
        leadPhone: lead.phone,
        leadCpf: lead.cpf,
        leadBirthDate,
        partnerName: partner.name,
        partnerPhone: partner.phone,
        partnerCpf: partner.cpf,
        partnerBirthDate,
        registrationOrder: registrationCount + 1,
        amountCents,
        paymentStatus: parsed.data.paymentStatus,
        status: parsed.data.paymentStatus === "PAID" ? "CONFIRMED" : "PENDING_PAYMENT",
        paymentProvider: "MANUAL",
        paymentReference: ""
      }
    });

    await ensureTournamentPairFromRegistration(tx, {
      arenaId: auth.arenaId,
      tournamentId: tournament.id,
      leadName: lead.name,
      partnerName: partner.name
    });
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

export async function updateTournamentRegistrationAction(
  stateOrFormData: ActionState | FormData,
  maybeFormData?: FormData
): Promise<ActionState> {
  const formData = stateOrFormData instanceof FormData ? stateOrFormData : maybeFormData;
  if (!formData) {
    return { error: "Dados invalidos.", success: null };
  }

  const auth = await requireModuleEdit("tournaments");
  const parsed = updateManualTournamentRegistrationSchema.safeParse({
    registrationId: formData.get("registrationId"),
    tournamentId: formData.get("tournamentId"),
    categoryId: formData.get("categoryId"),
    leadName: formData.get("leadName"),
    leadPhone: formData.get("leadPhone"),
    leadCpf: normalizeCpf(String(formData.get("leadCpf") ?? "")),
    leadBirthDate: normalizeDateInput(formData.get("leadBirthDate")),
    partnerName: formData.get("partnerName"),
    partnerPhone: formData.get("partnerPhone"),
    partnerCpf: normalizeCpf(String(formData.get("partnerCpf") ?? "")),
    partnerBirthDate: normalizeDateInput(formData.get("partnerBirthDate")),
    amountReais: formData.get("amountReais"),
    paymentStatus: formData.get("paymentStatus")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invalidos.", success: null };
  }

  const registration = await prisma.publicTournamentRegistration.findFirst({
    where: {
      id: parsed.data.registrationId,
      tournamentId: parsed.data.tournamentId,
      tournament: { arenaId: auth.arenaId }
    },
    select: { id: true }
  });

  if (!registration) {
    return { error: "Inscricao nao encontrada.", success: null };
  }

  const amountCents = parseReaisToCents(parsed.data.amountReais);
  await prisma.publicTournamentRegistration.update({
    where: { id: registration.id },
    data: {
      categoryId: parsed.data.categoryId,
      leadName: parsed.data.leadName,
      leadPhone: parsed.data.leadPhone,
      leadCpf: parsed.data.leadCpf,
      leadBirthDate: parsed.data.leadBirthDate,
      partnerName: parsed.data.partnerName,
      partnerPhone: parsed.data.partnerPhone,
      partnerCpf: parsed.data.partnerCpf,
      partnerBirthDate: parsed.data.partnerBirthDate,
      amountCents,
      paymentStatus: parsed.data.paymentStatus,
      status: parsed.data.paymentStatus === "PAID" ? "CONFIRMED" : "PENDING_PAYMENT"
    }
  });

  if (parsed.data.paymentStatus === "PAID") {
    const refreshed = await prisma.publicTournamentRegistration.findUnique({
      where: { id: registration.id },
      include: {
        tournament: {
          select: {
            id: true,
            arenaId: true
          }
        }
      }
    });

    if (refreshed) {
      await prisma.$transaction(async (tx) => {
        await ensureTournamentPairFromRegistration(tx, {
          arenaId: refreshed.tournament.arenaId,
          tournamentId: refreshed.tournament.id,
          leadName: refreshed.leadName,
          partnerName: refreshed.partnerName
        });
      });
    }
  }

  refreshTournamentRoutes();
  revalidatePath(`/torneios/${parsed.data.tournamentId}`);
  return { error: null, success: "Inscricao atualizada com sucesso." };
}




