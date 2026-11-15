"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isPrismaUnknownFieldError } from "@/lib/prisma-errors";
import { requireTournamentMatchEdit, requireTournamentResultEdit } from "@/lib/auth/guards";
import { updateMatchCourtSchema, updateMatchManualStatusSchema, updateMatchTvVisibilitySchema, updateMatchParticipantsSchema, updateMatchResultSchema, updateMatchScheduleSchema } from "@/lib/validators/match";
import { updateKnockoutParticipants, updateMatchResult } from "@/lib/services/tournament";
import { refreshTournamentRoutes } from "@/lib/tournament/revalidation";

export async function updateMatchCourtAction(formData: FormData) {
  const auth = await requireTournamentMatchEdit();
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
  const auth = await requireTournamentMatchEdit();
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
  const auth = await requireTournamentResultEdit();
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
  const auth = await requireTournamentMatchEdit();
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
  const auth = await requireTournamentMatchEdit();
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
  const auth = await requireTournamentMatchEdit();
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
