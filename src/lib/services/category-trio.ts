import "server-only";
import { runSerializableTransaction, assertStoredMatchCanBeCorrected, resetKnockoutFromStandings, advanceKnockoutWinner, invalidateKnockoutBracket } from "@/lib/services/category-competition/shared";
import { summarizeTrioGames, validateTrioGame, type TrioGameResult } from "@/lib/tournament-category/trio";

export async function recordCategoryTrioGame(arenaId: string, matchId: string, input: TrioGameResult, actor?: { id: string; name: string }) {
  return runSerializableTransaction(arenaId, async tx => {
    const match = await tx.categoryMatch.findFirst({
      where: { id: matchId, competition: { format: "TRIO", status: "PUBLISHED", category: { active: true, tournament: { arenaId } } } },
      include: { homePair: { include: { players: true } }, awayPair: { include: { players: true } }, trioGames: { orderBy: { gameNumber: "asc" } } },
    });
    if (!match || !match.homePair || !match.awayPair) throw new Error("Confronto de Trio publicado não encontrado nesta arena.");
    await assertStoredMatchCanBeCorrected(tx, match);
    // Never rebuild a bracket after any knockout game has started, even before its encounter finishes.
    if (match.stage === "GROUP" && await tx.categoryTrioGame.count({ where: { competitionId: match.competitionId, match: { stage: { not: "GROUP" } } } })) throw new Error("O mata-mata já começou. Não é possível alterar os resultados dos grupos.");
    const next = validateTrioGame(input, match.homePair.players.map(player => player.playerId), match.awayPair.players.map(player => player.playerId), match.trioGames);
    const summary = summarizeTrioGames(next);
    const homePlayerIds = [...input.homePlayerIds].sort(), awayPlayerIds = [...input.awayPlayerIds].sort();
    await tx.categoryTrioGame.upsert({
      where: { matchId_gameNumber: { matchId: match.id, gameNumber: input.gameNumber } },
      create: { matchId: match.id, competitionId: match.competitionId, gameNumber: input.gameNumber, homePlayerIds, awayPlayerIds, homeScore: input.homeScore, awayScore: input.awayScore },
      update: { homePlayerIds, awayPlayerIds, homeScore: input.homeScore, awayScore: input.awayScore },
    });
    const winnerPairId = summary.finished ? (summary.homeWins > summary.awayWins ? match.homePair.id : match.awayPair.id) : null;
    await tx.categoryMatch.update({ where: { id: match.id }, data: { homeScore: summary.homeWins, awayScore: summary.awayWins, winnerPairId, manualStatus: summary.finished ? "FINISHED" : "LIVE" } });
    if (match.stage === "GROUP") {
      if (match.winnerPairId && !summary.finished) await invalidateKnockoutBracket(tx, match.competitionId);
      const pending = await tx.categoryMatch.count({ where: { competitionId: match.competitionId, stage: "GROUP", winnerPairId: null } });
      if (!pending) await resetKnockoutFromStandings(tx, match.competitionId, "TRIO");
    } else if (winnerPairId) {
      await advanceKnockoutWinner(tx, match, winnerPairId);
    }
    const previous = match.trioGames.find(game => game.gameNumber === input.gameNumber);
    const before = previous ? { gameNumber: previous.gameNumber, homePlayerIds: previous.homePlayerIds, awayPlayerIds: previous.awayPlayerIds, homeScore: previous.homeScore, awayScore: previous.awayScore } : null;
    await tx.auditEvent.create({ data: { arenaId, actorId: actor?.id ?? "SYSTEM", actorName: actor?.name ?? "Sistema", action: "TRIO_GAME_RESULT", entityId: match.id, details: { gameNumber: input.gameNumber, before, after: { ...input, homePlayerIds, awayPlayerIds }, aggregate: summary } } });
    return summary;
  });
}
