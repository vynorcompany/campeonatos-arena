import "server-only";
import { buildGroups, buildKnockout, buildRoundRobin } from "@/lib/tournament-category/draw";
import { buildMonthlyLeagueSchedule, getLeagueMonthBlocks } from "@/lib/league/monthly-schedule";
import { leagueReferenceMonth } from "@/lib/league/reference-month";
import { selectQuarterfinalists } from "@/lib/tournament-category/standings";
import type { GroupStandings } from "@/lib/tournament-category/types";
import { categoryCompetitionStatus, categoryMatchStage, getKnockoutLabel, runSerializableTransaction } from "@/lib/services/category-competition/shared";

export async function generateCategoryDraw(
  arenaId: string,
  competitionId: string,
) {
  return runSerializableTransaction(arenaId, async (tx) => {
    const competition = await tx.categoryCompetition.findFirst({
      where: {
        id: competitionId,
        status: categoryCompetitionStatus.DRAFT,
        category: {
          active: true,
          tournament: { arenaId },
        },
      },
      select: {
        id: true,
        format: true,
        pairs: {
          where: { active: true },
          orderBy: { drawOrder: "asc" },
          select: { id: true },
        },
      },
    });
    if (!competition) {
      throw new Error("Somente uma competição em rascunho pode ser sorteada.");
    }
    if (!competition.pairs.length) {
      throw new Error("Adicione duplas antes de gerar o sorteio.");
    }

    const groups = buildGroups({
      format: competition.format,
      pairIds: competition.pairs.map((pair) => pair.id),
    });

    await tx.categoryMatch.deleteMany({
      where: { competitionId: competition.id },
    });
    await tx.categoryPair.updateMany({
      where: { competitionId: competition.id },
      data: { groupId: null },
    });
    await tx.categoryGroup.deleteMany({
      where: { competitionId: competition.id },
    });

    for (const [groupIndex, group] of groups.entries()) {
      const createdGroup = await tx.categoryGroup.create({
        data: {
          competitionId: competition.id,
          name: group.name,
          drawOrder: groupIndex + 1,
        },
      });
      await tx.categoryPair.updateMany({
        where: {
          competitionId: competition.id,
          id: { in: group.pairIds },
        },
        data: { groupId: createdGroup.id },
      });
    }

    return groups;
  });
}

export async function publishCategoryDraw(
  arenaId: string,
  competitionId: string,
) {
  return runSerializableTransaction(arenaId, async (tx) => {
    const competition = await tx.categoryCompetition.findFirst({
      where: {
        id: competitionId,
        status: categoryCompetitionStatus.DRAFT,
        category: {
          active: true,
          tournament: { arenaId },
        },
      },
      select: {
        id: true,
        format: true,
        pairs: {
          where: { active: true },
          orderBy: { drawOrder: "asc" },
          select: {
            id: true,
            groupId: true,
            players: { select: { playerId: true } },
          },
        },
        groups: {
          orderBy: { drawOrder: "asc" },
          select: {
            id: true,
            name: true,
            pairs: {
              orderBy: { drawOrder: "asc" },
              select: { id: true },
            },
          },
        },
      },
    });
    if (!competition) {
      throw new Error("Somente uma competição em rascunho pode ser publicada.");
    }
    if (
      !competition.groups.length ||
      competition.pairs.some((pair) => !pair.groupId)
    ) {
      throw new Error("Gere os grupos e distribua todas as duplas antes de publicar.");
    }

    if (competition.format === "TRIO") {
      if (competition.pairs.some(pair => pair.players.length !== 3)) throw new Error("Cada equipe do Trio deve ter três atletas.");
      if (await tx.publicTournamentRegistration.count({ where: { competitionId: competition.id, status: "PENDING_PAYMENT" } })) throw new Error("Confirme ou cancele as inscrições pendentes antes de publicar o Trio.");
    }

    const standings: GroupStandings[] = competition.groups.map((group) => ({
      rows: group.pairs.map((pair) => ({
        pairId: pair.id,
        victories: 0,
        differential: 0,
      })),
      matches: [],
    }));
    const qualifiedPairIds =
      competition.format === "LEAGUE"
        ? []
        : selectQuarterfinalists(standings);
    if (
      competition.format !== "LEAGUE" &&
      qualifiedPairIds.length !== 8
    ) {
      throw new Error("A categoria precisa produzir exatamente oito classificadas.");
    }

    await tx.categoryMatch.deleteMany({
      where: { competitionId: competition.id },
    });

    const referenceMonth = leagueReferenceMonth(new Date());
    const [referenceYear, referenceMonthNumber] = referenceMonth.split("-").map(Number);
    const monthlySchedule = competition.format === "LEAGUE" ? buildMonthlyLeagueSchedule(competition.pairs.map((pair) => pair.id)) : null;
    const leagueBlocks = getLeagueMonthBlocks(referenceYear, referenceMonthNumber);
    const leagueCycle = monthlySchedule ? await tx.leagueCycle.upsert({
      where: { competitionId_referenceMonth: { competitionId: competition.id, referenceMonth } },
      update: { status: "OPEN", closedAt: null },
      create: { competitionId: competition.id, referenceMonth },
      select: { id: true },
    }) : null;

    let roundOrder = 0;
    for (const [groupIndex, group] of competition.groups.entries()) {
      const groupMatches = monthlySchedule && groupIndex === 0
        ? monthlySchedule.matches
        : buildRoundRobin(group.pairs.map((pair) => pair.id));
      for (const [matchIndex, match] of groupMatches.entries()) {
        roundOrder += 1;
        const block = monthlySchedule && groupIndex === 0 ? monthlySchedule.matches[matchIndex]?.blockNumber ?? null : null;
        const blockEnd = block ? leagueBlocks[block - 1].endsOn : null;
        await tx.categoryMatch.create({
          data: {
            competitionId: competition.id,
            groupId: group.id,
            stage: categoryMatchStage.GROUP,
            label: `${group.name} · Jogo ${matchIndex + 1}`,
            roundOrder,
            homePairId: match.homePairId,
            awayPairId: match.awayPairId,
            leagueCycleId: leagueCycle?.id,
            leagueBlock: block,
            hostProposalDeadline: blockEnd ? new Date(`${blockEnd}T23:59:59`) : null,
          },
        });
      }
    }

    const knockout = buildKnockout(competition.format, qualifiedPairIds);
    const stageIndexes = new Map<string, number>();
    for (const match of knockout) {
      roundOrder += 1;
      const stageIndex = stageIndexes.get(match.stage) ?? 0;
      stageIndexes.set(match.stage, stageIndex + 1);
      await tx.categoryMatch.create({
        data: {
          competitionId: competition.id,
          stage: match.stage,
          label: getKnockoutLabel(match.stage, stageIndex),
          roundOrder,
          homePairId: null,
          awayPairId: null,
        },
      });
    }

    await tx.categoryCompetition.update({
      where: { id: competition.id },
      data: { status: categoryCompetitionStatus.PUBLISHED },
    });

    return true;
  });
}
