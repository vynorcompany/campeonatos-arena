import "server-only";
import { recalculateTournamentRankingPointsTx } from "@/lib/services/tournament-ranking";
import { prisma } from "@/lib/prisma";
import { arenaDatabase } from "@/lib/arena-database";
import { withArenaTransaction } from "@/lib/rls";
import { lockIndividualRanking, resetTournamentStructure, tournamentStatus } from "@/lib/services/tournament/shared";

export async function finishTournament(tournamentId: string, arenaId: string) {
  const updated = await prisma.tournament.updateMany({
    where: {
      id: tournamentId,
      arenaId,
      status: {
        not: tournamentStatus.FINISHED
      }
    },
    data: {
      status: tournamentStatus.FINISHED
    }
  });

  if (!updated.count) {
    throw new Error("Torneio nÃ£o encontrado ou jÃ¡ finalizado.");
  }

  return true;
}

export async function reopenTournament(tournamentId: string, arenaId: string) {
  const tournament = await arenaDatabase(arenaId).tournament.findFirst({
    where: {
      id: tournamentId,
      arenaId,
      status: tournamentStatus.FINISHED
    },
    select: {
      id: true,
      _count: {
        select: {
          entries: true,
          pairs: true,
          groups: true,
          matches: true,
          publicRegistrations: true,
          categoryBrackets: true
        }
      }
    }
  });

  if (!tournament) {
    throw new Error("Torneio não encontrado ou não está finalizado.");
  }

  const hasMatches = tournament._count.matches > 0 || tournament._count.categoryBrackets > 0;
  const hasGroups = tournament._count.groups > 0;
  const hasParticipants =
    tournament._count.entries > 0 ||
    tournament._count.pairs > 0 ||
    tournament._count.publicRegistrations > 0;
  const reopenedStatus = hasMatches
    ? tournamentStatus.MATCHES_DEFINED
    : hasGroups
      ? tournamentStatus.GROUPS_DEFINED
      : hasParticipants
        ? tournamentStatus.READY_FOR_DRAW
        : tournamentStatus.DRAFT;

  const reopened = await prisma.tournament.updateMany({
    where: {
      id: tournament.id,
      arenaId,
      status: tournamentStatus.FINISHED
    },
    data: {
      status: reopenedStatus,
      registrationPhase: "EDITING"
    }
  });

  if (!reopened.count) {
    throw new Error("O torneio já foi alterado. Atualize a página e tente novamente.");
  }

  return true;
}

export async function deleteTournament(tournamentId: string, arenaId: string) {
  const deleted = await prisma.tournament.deleteMany({
    where: {
      id: tournamentId,
      arenaId
    }
  });

  if (!deleted.count) {
    throw new Error("Torneio nÃ£o encontrado.");
  }

  return true;
}

export async function updateTournamentSettings(
  tournamentId: string,
  arenaId: string,
  input: {
    creationMode: "MANUAL" | "PUBLIC";
    name: string;
    description: string;
    responsibleName: string;
    responsiblePhone: string;
    startsAt: Date | null;
    endsAt: Date | null;
    registrationOpensAt: Date | null;
    registrationClosesAt: Date | null;
    earlyDiscountCents: number;
    earlyDiscountUntil: Date | null;
    firstBonusLimit: number;
    firstBonusUntil: Date | null;
    publicSlug: string;
    registrationPhase: string;
    showInEventRadar: boolean;
    groupCount: number;
    pairsPerGroup: number;
    priceFirstCents: number;
    priceSecondCents: number;
    priceThirdCents: number;
    blockCategoryGap: boolean;
    maxCategoryGap: number;
    categoryList: Array<{
      name: string;
      level: number;
      groupCount: number;
      pairsPerGroup: number;
      priceFirstCents: number;
      priceSecondCents: number;
      priceThirdCents: number;
      standardKey: string;
      allowedRegistrationStandardKeys: string[];
      maxRegistrations: number;
      active: boolean;
    }>;
    rankingId: string | null;
  }
) {
  const tournament = await prisma.tournament.findFirst({
    where: {
      id: tournamentId,
      arenaId
    },
    select: {
      id: true,
      groupCount: true,
      pairsPerGroup: true,
      _count: {
        select: {
          entries: true
        }
      }
    }
  });

  if (!tournament) {
    throw new Error("Torneio nÃ£o encontrado.");
  }

  const structureChanged =
    tournament.groupCount !== input.groupCount ||
    tournament.pairsPerGroup !== input.pairsPerGroup;

  await withArenaTransaction(arenaId, async (tx) => {
    await lockIndividualRanking(tx, arenaId, input.rankingId);

    if (structureChanged) {
      await resetTournamentStructure(tx, tournamentId);
      await tx.pair.updateMany({
        where: { tournamentId },
        data: {
          groupId: null
        }
      });
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        name: input.name,
        description: input.description,
        responsibleName: input.responsibleName,
        responsiblePhone: input.responsiblePhone,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        registrationOpensAt: input.registrationOpensAt,
        registrationClosesAt: input.registrationClosesAt,
        earlyDiscountCents: input.earlyDiscountCents,
        earlyDiscountUntil: input.earlyDiscountUntil,
        firstBonusLimit: input.firstBonusLimit,
        firstBonusUntil: input.firstBonusUntil,
        publicSlug: input.publicSlug,
        creationMode: input.creationMode,
        registrationPhase: input.registrationPhase,
        showInEventRadar: input.showInEventRadar,
        groupCount: input.groupCount,
        pairsPerGroup: input.pairsPerGroup,
        priceFirstCents: input.priceFirstCents,
        priceSecondCents: input.priceSecondCents,
        priceThirdCents: input.priceThirdCents,
        blockCategoryGap: input.blockCategoryGap,
        maxCategoryGap: input.maxCategoryGap,
        rankingId: input.rankingId,
        ...(structureChanged
          ? {
              status: tournament._count.entries ? tournamentStatus.READY_FOR_DRAW : tournamentStatus.DRAFT
            }
          : {})
      }
    });

    const existingCategories = await tx.tournamentCategory.findMany({
      where: { tournamentId },
      select: { id: true, name: true }
    });

    const existingByName = new Map(existingCategories.map((category) => [category.name, category]));
    const nextNames = new Set(input.categoryList.map((category) => category.name));

    for (const category of input.categoryList) {
      const existing = existingByName.get(category.name);
      if (existing) {
        await tx.tournamentCategory.update({
          where: { id: existing.id },
          data: {
            level: category.level,
            groupCount: category.groupCount,
            pairsPerGroup: category.pairsPerGroup,
            priceFirstCents: category.priceFirstCents,
            priceSecondCents: category.priceSecondCents,
            priceThirdCents: category.priceThirdCents,
            standardKey: category.standardKey,
            maxRegistrations: category.maxRegistrations,
            active: category.active
          }
        });
      } else {
        await tx.tournamentCategory.create({
          data: {
            tournamentId,
            name: category.name,
            level: category.level,
            groupCount: category.groupCount,
            pairsPerGroup: category.pairsPerGroup,
            priceFirstCents: category.priceFirstCents,
            priceSecondCents: category.priceSecondCents,
            priceThirdCents: category.priceThirdCents,
            standardKey: category.standardKey,
            maxRegistrations: category.maxRegistrations,
            active: category.active
          }
        });
      }
    }

    const persistedCategories = await tx.tournamentCategory.findMany({ where: { tournamentId }, select: { id: true, name: true, standardKey: true } });
    const categoryIdsByName = new Map(persistedCategories.map((category) => [category.name, category.id]));
    for (const category of input.categoryList) {
      const id = categoryIdsByName.get(category.name);
      if (!id) continue;
      await tx.tournamentCategory.update({
        where: { id },
        data: {
          allowedRegistrationCategoryIds: persistedCategories
            .filter((candidate) => candidate.id !== id && category.allowedRegistrationStandardKeys.includes(candidate.standardKey))
            .map((candidate) => candidate.id)
        }
      });
    }

    const categoriesToRemove = existingCategories.filter((category) => !nextNames.has(category.name));
    for (const category of categoriesToRemove) {
      const registrationCount = await tx.publicTournamentRegistration.count({
        where: { categoryId: category.id }
      });

      if (registrationCount > 0) {
        await tx.tournamentCategory.update({
          where: { id: category.id },
          data: { active: false }
        });
      } else {
        await tx.tournamentCategory.delete({
          where: { id: category.id }
        });
      }
    }

    await recalculateTournamentRankingPointsTx(tx, tournamentId);
  });

  return true;
}
