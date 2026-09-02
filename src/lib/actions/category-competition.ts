"use server";

import { revalidatePath } from "next/cache";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { closeLeagueCycleManually } from "@/lib/league/lifecycle";
import { parseReaisToCents } from "@/lib/tournaments/inputs";
import {
  leagueMatchResultErrorState,
  type LeagueMatchResultActionState,
} from "@/lib/actions/league-match-result-state";
import { parseLeagueMatchResultInput } from "@/lib/actions/league-match-result-input";
import {
  addManualPair,
  createCategoryCompetition,
  finishCategoryCompetition,
  generateCategoryDraw,
  moveCategoryPair,
  replaceCategoryPairPlayer,
  publishCategoryDraw,
  reopenCategoryLeagueForEditing,
  recordCategoryMatchResult,
  recordCategoryLeagueMatchResult,
  resetCategoryLeagueMatchResult,
  removeCategoryPair,
  updateCategoryMatchStatus,
  updateCategoryMatchSchedule,
  updateCategoryPublicVisibility,
} from "@/lib/services/category-competition";
import {
  addManualPairSchema,
  createCategoryCompetitionSchema,
  finishCategoryCompetitionSchema,
  generateCategoryDrawSchema,
  moveCategoryPairSchema,
  replaceCategoryPairPlayerSchema,
  publishCategoryDrawSchema,
  recordCategoryMatchResultSchema,
  resetCategoryLeagueMatchResultSchema,
  removeCategoryPairSchema,
  updateCategoryMatchScheduleSchema,
  updateCategoryMatchStatusSchema,
  updateCategoryPublicVisibilitySchema,
} from "@/lib/validators/category-competition";

function invalidInputMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

function refreshCategoryCompetitionRoutes() {
  revalidatePath("/torneios");
  revalidatePath("/tournaments");
  revalidatePath("/torneios/rankings");
  revalidatePath("/jogos");
  revalidatePath("/matches");
  revalidatePath("/classificacao/[arenaSlug]", "page");
}

export async function createCategoryCompetitionAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = createCategoryCompetitionSchema.safeParse({
    categoryId: formData.get("categoryId"),
    class: formData.get("class"),
    gender: formData.get("gender"),
    format: formData.get("format"),
    leagueTier: formData.get("leagueTier") || undefined,
    rankingId: formData.get("rankingId"),
    isPublic: formData.get("isPublic"),
  });
  if (!parsed.success) {
    throw new Error(invalidInputMessage(parsed.error));
  }

  const result = await createCategoryCompetition(auth.arenaId, parsed.data);
  refreshCategoryCompetitionRoutes();
  return result;
}

export async function addManualPairAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = addManualPairSchema.safeParse({
    competitionId: formData.get("competitionId"),
    firstPlayerId: formData.get("firstPlayerId"),
    secondPlayerId: formData.get("secondPlayerId"),
  });
  if (!parsed.success) {
    throw new Error(invalidInputMessage(parsed.error));
  }

  const result = await addManualPair(
    auth.arenaId,
    parsed.data.competitionId,
    parsed.data.firstPlayerId,
    parsed.data.secondPlayerId,
  );
  refreshCategoryCompetitionRoutes();
  return result;
}

export async function removeCategoryPairAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = removeCategoryPairSchema.safeParse({
    pairId: formData.get("pairId"),
  });
  if (!parsed.success) {
    throw new Error(invalidInputMessage(parsed.error));
  }

  const result = await removeCategoryPair(auth.arenaId, parsed.data.pairId);
  refreshCategoryCompetitionRoutes();
  return result;
}

export async function generateCategoryDrawAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = generateCategoryDrawSchema.safeParse({
    competitionId: formData.get("competitionId"),
  });
  if (!parsed.success) {
    throw new Error(invalidInputMessage(parsed.error));
  }

  const result = await generateCategoryDraw(
    auth.arenaId,
    parsed.data.competitionId,
  );
  refreshCategoryCompetitionRoutes();
  return result;
}

export async function moveCategoryPairAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = moveCategoryPairSchema.safeParse({
    pairId: formData.get("pairId"),
    targetGroupId: formData.get("targetGroupId"),
  });
  if (!parsed.success) {
    throw new Error(invalidInputMessage(parsed.error));
  }

  const result = await moveCategoryPair(
    auth.arenaId,
    parsed.data.pairId,
    parsed.data.targetGroupId,
  );
  refreshCategoryCompetitionRoutes();
  return result;
}

export async function replaceCategoryPairPlayerAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = replaceCategoryPairPlayerSchema.safeParse({
    pairId: formData.get("pairId"),
    previousPlayerId: formData.get("previousPlayerId"),
    replacementPlayerId: formData.get("replacementPlayerId"),
  });
  if (!parsed.success) {
    throw new Error(invalidInputMessage(parsed.error));
  }

  const result = await replaceCategoryPairPlayer(auth.arenaId, parsed.data);
  refreshCategoryCompetitionRoutes();
  return result;
}

export async function publishCategoryDrawAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = publishCategoryDrawSchema.safeParse({
    competitionId: formData.get("competitionId"),
  });
  if (!parsed.success) {
    throw new Error(invalidInputMessage(parsed.error));
  }

  const result = await publishCategoryDraw(
    auth.arenaId,
    parsed.data.competitionId,
  );
  refreshCategoryCompetitionRoutes();
  return result;
}

export async function recordCategoryMatchResultAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = recordCategoryMatchResultSchema.safeParse({
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
  });
  if (!parsed.success) {
    throw new Error(invalidInputMessage(parsed.error));
  }

  const result = await recordCategoryMatchResult(
    auth.arenaId,
    parsed.data.matchId,
    parsed.data.homeScore,
    parsed.data.awayScore,
  );
  refreshCategoryCompetitionRoutes();
  return result;
}

export async function recordCategoryLeagueMatchResultAction(
  _: LeagueMatchResultActionState,
  formData: FormData,
): Promise<LeagueMatchResultActionState> {
  const auth = await requireModuleEdit("tournaments");
  const input = parseLeagueMatchResultInput(formData);
  if ("success" in input) {
    return input;
  }

  try {
    await recordCategoryLeagueMatchResult(auth.arenaId, input);
  } catch (error) {
    return leagueMatchResultErrorState(error);
  }

  refreshCategoryCompetitionRoutes();
  return { error: null, success: true };
}

export async function resetCategoryLeagueMatchResultAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = resetCategoryLeagueMatchResultSchema.safeParse({
    matchId: formData.get("matchId"),
  });
  if (!parsed.success) throw new Error(invalidInputMessage(parsed.error));

  const result = await resetCategoryLeagueMatchResult(auth.arenaId, parsed.data.matchId);
  refreshCategoryCompetitionRoutes();
  return result;
}

export async function reopenCategoryLeagueForEditingAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = publishCategoryDrawSchema.safeParse({ competitionId: formData.get("competitionId") });
  if (!parsed.success) throw new Error(invalidInputMessage(parsed.error));
  const result = await reopenCategoryLeagueForEditing(auth.arenaId, parsed.data.competitionId);
  refreshCategoryCompetitionRoutes();
  return result;
}

export async function updateCategoryMatchStatusAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = updateCategoryMatchStatusSchema.safeParse({
    matchId: formData.get("matchId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    throw new Error(invalidInputMessage(parsed.error));
  }

  const result = await updateCategoryMatchStatus(
    auth.arenaId,
    parsed.data.matchId,
    parsed.data.status,
  );
  refreshCategoryCompetitionRoutes();
  return result;
}

export async function updateCategoryMatchScheduleAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = updateCategoryMatchScheduleSchema.safeParse({
    matchId: formData.get("matchId"),
    scheduledDate: formData.get("scheduledDate"),
    scheduledTime: formData.get("scheduledTime"),
  });
  if (!parsed.success) {
    throw new Error(invalidInputMessage(parsed.error));
  }

  const result = await updateCategoryMatchSchedule(
    auth.arenaId,
    parsed.data.matchId,
    parsed.data.scheduledDate,
    parsed.data.scheduledTime,
  );
  refreshCategoryCompetitionRoutes();
  return result;
}

export async function finishCategoryCompetitionAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = finishCategoryCompetitionSchema.safeParse({
    competitionId: formData.get("competitionId"),
  });
  if (!parsed.success) {
    throw new Error(invalidInputMessage(parsed.error));
  }

  const result = await finishCategoryCompetition(
    auth.arenaId,
    parsed.data.competitionId,
  );
  refreshCategoryCompetitionRoutes();
  return result;
}

export async function updateCategoryPublicVisibilityAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = updateCategoryPublicVisibilitySchema.safeParse({
    competitionId: formData.get("competitionId"),
    isPublic: formData.get("isPublic"),
  });
  if (!parsed.success) {
    throw new Error(invalidInputMessage(parsed.error));
  }

  const result = await updateCategoryPublicVisibility(
    auth.arenaId,
    parsed.data.competitionId,
    parsed.data.isPublic,
  );
  refreshCategoryCompetitionRoutes();
  return result;
}

export async function updateLeaguePrizeAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const competitionId = String(formData.get("competitionId") ?? "").trim();
  const prizeDescription = String(formData.get("prizeDescription") ?? "").trim().slice(0, 1600);
  if (!competitionId) throw new Error("Liga inválida.");
  const competition = await prisma.categoryCompetition.findFirst({ where: { id: competitionId, format: "LEAGUE", category: { tournament: { arenaId: auth.arenaId } } }, select: { id: true } });
  if (!competition) throw new Error("Liga não encontrada.");
  const openCycle = await prisma.leagueCycle.findFirst({
    where: { competitionId, status: "OPEN" },
    orderBy: { referenceMonth: "desc" },
    select: { id: true },
  });
  if (openCycle) {
    await prisma.leagueCycle.update({ where: { id: openCycle.id }, data: { prizeDescription } });
  } else {
    const now = new Date();
    const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    await prisma.leagueCycle.create({ data: { competitionId, referenceMonth, prizeDescription } });
  }
  refreshCategoryCompetitionRoutes();
}

export async function updateLeagueCategoryAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const className = String(formData.get("class") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim().toUpperCase();
  const leagueTier = String(formData.get("leagueTier") ?? "").trim().toUpperCase();
  let registrationFeeCents: number;
  try {
    registrationFeeCents = parseReaisToCents(formData.get("registrationFee"));
  } catch {
    throw new Error("Informe um valor de inscrição válido.");
  }
  if (!categoryId || !name || !className || !["FEMININO", "MASCULINO"].includes(gender) || !["A", "B"].includes(leagueTier)) {
    throw new Error("Preencha nome, classe, gênero e nível da Liga.");
  }
  const category = await prisma.tournamentCategory.findFirst({ where: { id: categoryId, tournament: { arenaId: auth.arenaId }, competition: { format: "LEAGUE" } }, select: { id: true, competition: { select: { id: true, pairs: { where: { active: true }, select: { players: { select: { playerId: true } } } } } } } });
  if (!category?.competition) throw new Error("Categoria de Liga não encontrada.");
  const competition = category.competition;
  await prisma.$transaction(async (tx) => {
    await tx.tournamentCategory.update({ where: { id: category.id }, data: { name, class: className, gender } });
    await tx.categoryCompetition.update({ where: { id: competition.id }, data: { leagueTier, registrationFeeCents } });
    const playerIds = Array.from(new Set(competition.pairs.flatMap((pair) => pair.players.map((player) => player.playerId))));
    if (playerIds.length) {
      const current = await tx.leagueAthleteTier.findMany({ where: { arenaId: auth.arenaId, playerId: { in: playerIds }, modality: "PADEL", active: true }, select: { playerId: true, tier: true } });
      const unchanged = new Set(current.filter((item) => item.tier === leagueTier).map((item) => item.playerId));
      const changedIds = playerIds.filter((playerId) => !unchanged.has(playerId));
      if (changedIds.length) {
        await tx.leagueAthleteTier.updateMany({ where: { arenaId: auth.arenaId, playerId: { in: changedIds }, modality: "PADEL", active: true }, data: { active: false } });
        await tx.leagueAthleteTier.createMany({ data: changedIds.map((playerId) => ({ arenaId: auth.arenaId, playerId, modality: "PADEL", tier: leagueTier })) });
      }
    }
  });
  refreshCategoryCompetitionRoutes();
}

export async function runLeagueLifecycleAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const competitionId = String(formData.get("competitionId") ?? "").trim();
  if (!competitionId) throw new Error("Liga inválida.");
  const result = await closeLeagueCycleManually(competitionId, new Date(), auth.arenaId);
  refreshCategoryCompetitionRoutes();
  return result;
}
