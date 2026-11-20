import "server-only";
import { assertPortalMatchResultAccess, type PortalResultActor } from "@/lib/services/portal-match-result-access";
import { buildReopenedMatch, type CategoryMatchManualStatus } from "@/lib/tournament-category/match-status";
import { advanceKnockoutWinner, assertStoredMatchCanBeCorrected, categoryCompetitionStatus, categoryMatchStage, getWinnerPairId, invalidateKnockoutBracket, resetKnockoutFromStandings, runSerializableTransaction } from "@/lib/services/category-competition/shared";

export async function updateCategoryMatchSchedule(
  arenaId: string,
  matchId: string,
  scheduledDate: string | null,
  scheduledTime: string | null,
  courtName: string | null = null,
) {
  return runSerializableTransaction(arenaId, async (tx) => {
    const match = await tx.categoryMatch.findFirst({
      where: {
        id: matchId,
        competition: {
          category: {
            active: true,
            tournament: { arenaId },
          },
        },
      },
      select: { id: true, manualStatus: true },
    });
    if (!match) {
      throw new Error("Jogo não encontrado nesta arena.");
    }

    return tx.categoryMatch.update({
      where: { id: match.id },
      data: {
        scheduledDate,
        scheduledTime,
        courtName,
        manualStatus:
          match.manualStatus === "FINISHED"
            ? "FINISHED"
            : scheduledDate && scheduledTime
              ? "SCHEDULED"
              : "WAITING",
      },
    });
  });
}

export async function updateCategoryMatchStatus(
  arenaId: string,
  matchId: string,
  status: CategoryMatchManualStatus,
) {
  return runSerializableTransaction(arenaId, async (tx) => {
    const match = await tx.categoryMatch.findFirst({
      where: {
        id: matchId,
        competition: {
          status: categoryCompetitionStatus.PUBLISHED,
          category: {
            active: true,
            tournament: { arenaId },
          },
        },
      },
      select: {
        id: true,
        competitionId: true,
        stage: true,
        roundOrder: true,
        homePairId: true,
        awayPairId: true,
        homeScore: true,
        awayScore: true,
        winnerPairId: true,
        scheduledDate: true,
        scheduledTime: true,
      },
    });
    if (!match) {
      throw new Error("Jogo publicado não encontrado nesta arena.");
    }

    const category = await tx.categoryCompetition.findUnique({ where: { id: match.competitionId }, select: { format: true } });
    if (category?.format === "TRIO") throw new Error("O status do Trio é definido pelos jogos de ida, volta e desempate.");

    await assertStoredMatchCanBeCorrected(tx, match);

    if (status === "SCHEDULED" && (!match.scheduledDate || !match.scheduledTime)) {
      throw new Error("Defina data e horário antes de marcar o jogo como agendado.");
    }

    if (status === "FINISHED") {
      if (match.homeScore === null || match.awayScore === null) {
        throw new Error("Informe um placar vencedor antes de finalizar o jogo.");
      }
      if (!match.homePairId || !match.awayPairId) {
        throw new Error("Defina as duas duplas antes de finalizar o jogo.");
      }
      if (match.homeScore === match.awayScore) {
        throw new Error("O jogo precisa ter uma dupla vencedora.");
      }

      const winnerPairId = getWinnerPairId(
        match.homePairId,
        match.awayPairId,
        match.homeScore,
        match.awayScore,
      );
      await tx.categoryMatch.update({
        where: { id: match.id },
        data: {
          manualStatus: "FINISHED",
          winnerPairId,
        },
      });

      if (!match.winnerPairId && match.stage !== categoryMatchStage.GROUP) {
        await advanceKnockoutWinner(tx, match, winnerPairId);
      }

      return true;
    }

    await tx.categoryMatch.update({
      where: { id: match.id },
      data: buildReopenedMatch(match, status),
    });

    if (match.stage === categoryMatchStage.GROUP && match.winnerPairId) {
      await invalidateKnockoutBracket(tx, match.competitionId);
    }

    return true;
  });
}

export async function recordCategoryMatchResult(
  arenaId: string,
  matchId: string,
  homeScore: number,
  awayScore: number,
  portalActor?: PortalResultActor,
) {
  return runSerializableTransaction(arenaId, async (tx) => {
    if (portalActor) await assertPortalMatchResultAccess(tx, arenaId, matchId, portalActor);
    const match = await tx.categoryMatch.findFirst({
      where: {
        id: matchId,
        competition: {
          status: categoryCompetitionStatus.PUBLISHED,
          category: {
            active: true,
            tournament: { arenaId },
          },
        },
      },
      select: {
        id: true,
        competitionId: true,
        stage: true,
        roundOrder: true,
        homePairId: true,
        awayPairId: true,
        winnerPairId: true,
        competition: {
          select: { format: true },
        },
      },
    });
    if (!match) {
      throw new Error("Jogo publicado não encontrado nesta arena.");
    }
    if (portalActor && match.competition.format === "LEAGUE") throw new Error("Informe os sets para registrar um resultado de Liga.");
    if (match.competition.format === "TRIO") throw new Error("Registre cada jogo do Trio, com as respectivas formações.");
    if (!match.homePairId || !match.awayPairId) {
      throw new Error("Defina as duas duplas antes de salvar o resultado.");
    }
    if (homeScore === awayScore) {
      throw new Error("O jogo precisa ter uma dupla vencedora.");
    }

    await assertStoredMatchCanBeCorrected(tx, match);

    const winnerPairId = getWinnerPairId(
      match.homePairId,
      match.awayPairId,
      homeScore,
      awayScore,
    );
    await tx.categoryMatch.update({
      where: { id: match.id },
      data: {
        homeScore,
        awayScore,
        winnerPairId,
        manualStatus: "FINISHED",
      },
    });

    if (match.stage === categoryMatchStage.GROUP) {
      const pendingGroupMatches = await tx.categoryMatch.count({
        where: {
          competitionId: match.competitionId,
          stage: categoryMatchStage.GROUP,
          winnerPairId: null,
        },
      });
      if (pendingGroupMatches === 0) {
        await resetKnockoutFromStandings(
          tx,
          match.competitionId,
          match.competition.format,
        );
      }
    } else {
      await advanceKnockoutWinner(tx, match, winnerPairId);
    }

    if (portalActor) await tx.auditEvent.create({ data: { arenaId, actorId: portalActor.playerId, actorName: "Atleta pelo Portal", action: "PORTAL_MATCH_RESULT", entityId: match.id, details: { homeScore, awayScore } } });
    return true;
  });
}

export async function recordCategoryLeagueMatchResult(
  arenaId: string,
  input: {
    matchId: string; homeSet1: number | null; awaySet1: number | null;
    homeSet2: number | null; awaySet2: number | null;
    homeSet3: number | null; awaySet3: number | null;
  },
  notification?: { playerIds: string[]; href: string },
  portalActor?: PortalResultActor,
) {
  return runSerializableTransaction(arenaId, async (tx) => {
    const { matchId, ...setScores } = input;
    if (portalActor) await assertPortalMatchResultAccess(tx, arenaId, matchId, portalActor);
    const match = await tx.categoryMatch.findFirst({
      where: { id: matchId, competition: { status: categoryCompetitionStatus.PUBLISHED, format: "LEAGUE", category: { active: true, tournament: { arenaId } } } },
      select: { id: true, homePairId: true, awayPairId: true },
    });
    if (!match?.homePairId || !match.awayPairId) throw new Error("Jogo de Liga inválido.");
    const sets = [[input.homeSet1, input.awaySet1], [input.homeSet2, input.awaySet2], [input.homeSet3, input.awaySet3]];
    const homeWins = sets.filter(([home, away]) => home != null && away != null && home > away).length;
    const awayWins = sets.filter(([home, away]) => home != null && away != null && away > home).length;
    if (homeWins !== 2 && awayWins !== 2) throw new Error("Uma dupla deve vencer dois sets.");
    const saved = await tx.categoryMatch.update({ where: { id: match.id }, data: {
      ...setScores,
      homeScore: homeWins,
      awayScore: awayWins,
      winnerPairId: homeWins === 2 ? match.homePairId : match.awayPairId,
      manualStatus: "FINISHED",
    }});
    if (notification?.playerIds.length) {
      await tx.playerNotification.createMany({ data: notification.playerIds.map((playerId) => ({
        playerId, type: "LEAGUE_MATCH", title: "Resultado lançado pela dupla mandante",
        message: "Confira o placar informado para o seu jogo de Liga.", href: notification.href,
      })) });
    }
    if (portalActor) await tx.auditEvent.create({ data: { arenaId, actorId: portalActor.playerId, actorName: "Atleta pelo Portal", action: "PORTAL_LEAGUE_RESULT", entityId: match.id, details: { ...setScores, homeScore: homeWins, awayScore: awayWins } } });
    return saved;
  });
}

export async function resetCategoryLeagueMatchResult(
  arenaId: string,
  matchId: string,
) {
  return runSerializableTransaction(arenaId, async (tx) => {
    const match = await tx.categoryMatch.findFirst({
      where: {
        id: matchId,
        competition: {
          status: categoryCompetitionStatus.PUBLISHED,
          format: "LEAGUE",
          category: { active: true, tournament: { arenaId } },
        },
      },
      select: { id: true },
    });
    if (!match) throw new Error("Jogo de Liga publicado não encontrado nesta arena.");

    return tx.categoryMatch.update({
      where: { id: match.id },
      data: {
        homeSet1: null,
        awaySet1: null,
        homeSet2: null,
        awaySet2: null,
        homeSet3: null,
        awaySet3: null,
        homeScore: null,
        awayScore: null,
        winnerPairId: null,
        manualStatus: "WAITING",
      },
    });
  });
}
