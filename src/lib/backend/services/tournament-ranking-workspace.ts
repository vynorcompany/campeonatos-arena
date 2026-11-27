import "server-only";
import { requireModuleView } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";
import { getRankingProfileLeaderboard } from "@/lib/services/ranking";
import { tournamentRankingQuerySchema, tournamentRankingWorkspaceSchema } from "../contracts/tournament-ranking-workspace";
export async function resolveTournamentRankingWorkspace(input: unknown) {
 const query = tournamentRankingQuerySchema.parse(input), auth = await requireModuleView("tournaments");
 const ranking = await getRankingProfileLeaderboard(auth.arenaId, query.rankingId, { period: query.period, start: query.start, end: query.end, cycleId: query.cycleId });
 if (!ranking) return tournamentRankingWorkspaceSchema.parse({ ranking: null, formatLocked: false, categoryCompetitions: [] });
 const db = arenaDatabase(auth.arenaId);
 const [allCompetitions, categoryCompetitions] = await Promise.all([
  db.categoryCompetition.findMany({ where: { rankingId: ranking.id, category: { tournament: { arenaId: auth.arenaId } } }, select: { status: true } }),
  db.categoryCompetition.findMany({ where: { rankingId: ranking.id, category: { tournament: { arenaId: auth.arenaId, createdAt: { gte: ranking.period.start, ...(ranking.period.endExclusive ? { lt: ranking.period.endExclusive } : {}) } } } }, select: { id: true, status: true, format: true, category: { select: { name: true, tournament: { select: { id: true, name: true } } } } }, orderBy: { createdAt: "desc" } }),
 ]);
 return tournamentRankingWorkspaceSchema.parse({ ranking: {
  id: ranking.id, name: ranking.name, description: ranking.description, type: ranking.type, model: ranking.model, isGeneral: ranking.isGeneral, feedsGeneralRanking: ranking.feedsGeneralRanking,
  rules: ranking.rules.map(({ stageKey, points }) => ({ stageKey, points })), tournaments: ranking.tournaments.map(({ id, name, status }) => ({ id, name, status })),
  cycles: ranking.cycles.map(({ id, label, isCurrent }) => ({ id, label, isCurrent })), selectedCycleId: ranking.selectedCycleId,
  period: { mode: ranking.period.mode, label: ranking.period.label, query: ranking.period.query, error: ranking.period.error },
  leaderboard: ranking.leaderboard.map(({ playerId, playerName, points, tournamentsPlayed, lastTournamentName }) => ({ playerId, playerName, points, tournamentsPlayed, lastTournamentName: lastTournamentName ?? null })),
  pairLeaderboard: ranking.pairLeaderboard.map(({ pairKey, pairName, points, competitionsPlayed, lastTournamentName }) => ({ pairKey, pairName, points, competitionsPlayed, lastTournamentName: lastTournamentName ?? null })),
 }, formatLocked: allCompetitions.some(competition => competition.status !== "DRAFT"), categoryCompetitions });
}
