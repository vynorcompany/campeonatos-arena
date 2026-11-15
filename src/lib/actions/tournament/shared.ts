import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildRankingRuleValues, type RankingRuleValues } from "@/lib/ranking/rule-values";

export type ActionState = {
  error: string | null;
  success: string | null;
  tournamentId?: string;
};

export function parseOptionalDate(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function runRankingSerializableTransaction<T>(
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

export async function lockRankingProfile(
  tx: Prisma.TransactionClient,
  rankingId: string,
) {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext(${rankingId}))
  `;
}

export async function ensureGeneralRankingAvailable(
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

export async function ensureRankingBelongsToArena(
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

export async function syncRankingRules(
  tx: Prisma.TransactionClient,
  rankingId: string,
  values: RankingRuleValues
) {
  const rules = buildRankingRuleValues(values);
  const stageKeys = rules.map((rule) => rule.stageKey);

  await tx.rankingRule.deleteMany({
    where: {
      rankingId,
      stageKey: { notIn: stageKeys },
    },
  });

  await Promise.all(
    rules.map((rule) => {
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
          points: rule.points,
          displayOrder: rule.displayOrder
        },
        update: {
          label: rule.label,
          points: rule.points,
          displayOrder: rule.displayOrder
        }
      });
    })
  );
}

export function getPrismaMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Já existe um jogador com esse nome na arena.";
  }

  return fallback;
}

export async function getRankingUpdateError(error: unknown) {
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
