import "server-only";
import { prisma } from "@/lib/prisma";
import { requireModuleEdit, requirePermission, requireTournamentMatchEdit } from "@/lib/auth/guards";
import { updateTournamentEntryPointsSchema, updateTournamentParticipantsSchema } from "@/lib/validators/player";
import { createTournamentPairSchema, deleteTournamentPairSchema, moveTournamentPairGroupSchema, updateTournamentPairPointsSchema, updateTournamentPairSchema } from "@/lib/validators/pair";
import { createTournamentPair, deleteTournamentPair, distributeTournamentGroups, generateTournamentMatches, generateTournamentPairs, moveTournamentPairToGroup, syncTournamentEntries, updateTournamentPair, updateTournamentPairPoints } from "@/lib/services/tournament";
import { refreshTournamentRoutes } from "@/lib/tournament/revalidation";
import { ActionState } from "@/lib/actions/tournament/shared";

export const defaultTournamentDrawEffects = { refreshTournamentRoutes, errorMessage: (error: unknown) => error instanceof Error ? error.message : "Não foi possível alterar o evento." };

export async function updateTournamentEntryPointsAction(formData: FormData, effects = defaultTournamentDrawEffects) {
  const auth = await requirePermission("tournaments:manage");
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

  effects.refreshTournamentRoutes();
}

export async function syncEntriesAction(formData: FormData, effects = defaultTournamentDrawEffects) {
  const auth = await requirePermission("tournaments:manage");
  const parsed = updateTournamentParticipantsSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    playerIds: formData.getAll("playerIds").map(String)
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await syncTournamentEntries(parsed.data.tournamentId, auth.arenaId, parsed.data.playerIds);
  effects.refreshTournamentRoutes();
}

export async function syncEntriesStateAction(_: ActionState, formData: FormData, effects = defaultTournamentDrawEffects): Promise<ActionState> {
  try {
    await syncEntriesAction(formData, effects);
    return { error: null, success: "Participantes do torneio atualizados com sucesso." };
  } catch (error) {
    return {
      error: effects.errorMessage(error),
      success: null
    };
  }
}

export async function generatePairsAction(formData: FormData, effects = defaultTournamentDrawEffects) {
  const auth = await requireModuleEdit("pairs");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio inválido.");
  }

  await generateTournamentPairs(tournamentId, auth.arenaId);
  effects.refreshTournamentRoutes();
}

export async function createTournamentPairAction(_: ActionState, formData: FormData, effects = defaultTournamentDrawEffects): Promise<ActionState> {
  const auth = await requireModuleEdit("pairs");
  const parsed = createTournamentPairSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    playerAId: formData.get("playerAId"),
    playerBId: formData.get("playerBId")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };
  }

  try {
    await createTournamentPair(parsed.data.tournamentId, auth.arenaId, parsed.data.playerAId, parsed.data.playerBId);
  } catch (error) {
    return {
      error: effects.errorMessage(error),
      success: null
    };
  }

  effects.refreshTournamentRoutes();
  return { error: null, success: "Dupla criada com sucesso." };
}

export async function updateTournamentPairAction(formData: FormData, effects = defaultTournamentDrawEffects) {
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
  effects.refreshTournamentRoutes();
}

export async function deleteTournamentPairAction(formData: FormData, effects = defaultTournamentDrawEffects) {
  const auth = await requireModuleEdit("pairs");
  const parsed = deleteTournamentPairSchema.safeParse({
    pairId: formData.get("pairId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await deleteTournamentPair(parsed.data.pairId, auth.arenaId);
  effects.refreshTournamentRoutes();
}

export async function updateTournamentPairPointsAction(formData: FormData, effects = defaultTournamentDrawEffects) {
  const auth = await requireModuleEdit("pairs");
  const parsed = updateTournamentPairPointsSchema.safeParse({
    pairId: formData.get("pairId"),
    totalPoints: formData.get("totalPoints")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await updateTournamentPairPoints(parsed.data.pairId, auth.arenaId, parsed.data.totalPoints);
  effects.refreshTournamentRoutes();
}

export async function moveTournamentPairGroupAction(formData: FormData, effects = defaultTournamentDrawEffects) {
  const auth = await requireModuleEdit("groups");
  const parsed = moveTournamentPairGroupSchema.safeParse({
    pairId: formData.get("pairId"),
    targetGroupId: formData.get("targetGroupId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await moveTournamentPairToGroup(parsed.data.pairId, parsed.data.targetGroupId, auth.arenaId);
  effects.refreshTournamentRoutes();
}

export async function generateGroupsAction(formData: FormData, effects = defaultTournamentDrawEffects) {
  const auth = await requireModuleEdit("groups");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio inválido.");
  }

  await distributeTournamentGroups(tournamentId, auth.arenaId);
  effects.refreshTournamentRoutes();
}

export async function generateMatchesAction(formData: FormData, effects = defaultTournamentDrawEffects) {
  const auth = await requireTournamentMatchEdit();
  const tournamentId = String(formData.get("tournamentId") ?? "");

  if (!tournamentId) {
    throw new Error("Torneio inválido.");
  }

  await generateTournamentMatches(tournamentId, auth.arenaId);
  effects.refreshTournamentRoutes();
}
