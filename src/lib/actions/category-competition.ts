"use server";

import { revalidatePath } from "next/cache";
import { requireModuleEdit } from "@/lib/auth/guards";
import {
  addManualPair,
  createCategoryCompetition,
  finishCategoryCompetition,
  generateCategoryDraw,
  moveCategoryPair,
  publishCategoryDraw,
  recordCategoryMatchResult,
  removeCategoryPair,
  updateCategoryMatchSchedule,
} from "@/lib/services/category-competition";
import {
  addManualPairSchema,
  createCategoryCompetitionSchema,
  finishCategoryCompetitionSchema,
  generateCategoryDrawSchema,
  moveCategoryPairSchema,
  publishCategoryDrawSchema,
  recordCategoryMatchResultSchema,
  removeCategoryPairSchema,
  updateCategoryMatchScheduleSchema,
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
}

export async function createCategoryCompetitionAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = createCategoryCompetitionSchema.safeParse({
    categoryId: formData.get("categoryId"),
    class: formData.get("class"),
    gender: formData.get("gender"),
    format: formData.get("format"),
    rankingId: formData.get("rankingId"),
    feedsGeneralRanking: formData.get("feedsGeneralRanking"),
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
