"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { arenaDatabase } from "@/lib/arena-database";
import { resolveRankingPeriod } from "@/lib/ranking/period";
import { requirePermission } from "@/lib/auth/guards";
import { createRankingCycleSchema, createRankingProfileSchema, deleteRankingProfileSchema, getRankingRuleBlueprint, updateRankingConfigurationSchema, updateRankingPointsSchema, updateRankingProfileSchema } from "@/lib/validators/ranking";
import { recalculateTournamentRankingPoints } from "@/lib/services/tournament";
import { refreshTournamentRoutes } from "@/lib/tournament/revalidation";
import { RankingActionState, ensureGeneralRankingAvailable, getRankingUpdateError, lockRankingProfile, runRankingSerializableTransaction, syncRankingRules } from "@/lib/actions/tournament/shared";

export async function createRankingProfileAction(formData: FormData) {
  const auth = await requirePermission("tournaments:rankings");
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
  const auth = await requirePermission("tournaments:rankings");
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

  await Promise.all(linkedTournaments.map((tournament) => recalculateTournamentRankingPoints(tournament.id, auth.arenaId)));
  refreshTournamentRoutes();
  revalidatePath(`/torneios/rankings/${parsed.data.rankingId}`);
}

export async function updateRankingPointsAction(formData: FormData) {
  const auth = await requirePermission("tournaments:rankings");
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
      recalculateTournamentRankingPoints(tournament.id, auth.arenaId),
    ),
  );

  refreshTournamentRoutes();
  revalidatePath(`/torneios/rankings/${parsed.data.rankingId}`);
}

export async function updateRankingConfigurationAction(
  _: RankingActionState,
  formData: FormData,
): Promise<RankingActionState> {
  const auth = await requirePermission("tournaments:rankings");
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
  const auth = await requirePermission("tournaments:rankings");
  const prisma = arenaDatabase(auth.arenaId);
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
  const auth = await requirePermission("tournaments:rankings");
  const prisma = arenaDatabase(auth.arenaId);
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
  const auth = await requirePermission("tournaments:rankings");
  const prisma = arenaDatabase(auth.arenaId);
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
