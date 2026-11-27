import { z } from "zod";
export const tournamentRankingQuerySchema = z.object({
 rankingId: z.string().min(1).max(100), period: z.string().max(40).optional(), start: z.string().max(100).optional(), end: z.string().max(100).optional(), cycleId: z.string().max(100).optional(),
}).strict();
const tournament = z.object({ id: z.string(), name: z.string(), status: z.string() }).strict();
export const tournamentRankingWorkspaceSchema = z.object({
 ranking: z.object({
  id: z.string(), name: z.string(), description: z.string(), type: z.enum(["PAIR", "INDIVIDUAL"]), model: z.enum(["LEAGUE", "KNOCKOUT"]), isGeneral: z.boolean(), feedsGeneralRanking: z.boolean(),
  rules: z.array(z.object({ stageKey: z.string(), points: z.number() }).strict()),
  tournaments: z.array(tournament), cycles: z.array(z.object({ id: z.string(), label: z.string(), isCurrent: z.boolean() }).strict()), selectedCycleId: z.string(),
  period: z.object({ mode: z.enum(["month","quarter","semester","year","custom","cycle"]), label: z.string(), query: z.record(z.string(),z.string()), error: z.string().nullable() }).strict(),
  leaderboard: z.array(z.object({ playerId: z.string(), playerName: z.string(), points: z.number(), tournamentsPlayed: z.number(), lastTournamentName: z.string().nullable() }).strict()),
  pairLeaderboard: z.array(z.object({ pairKey: z.string(), pairName: z.string(), points: z.number(), competitionsPlayed: z.number(), lastTournamentName: z.string().nullable() }).strict()),
 }).strict().nullable(),
 formatLocked: z.boolean(), categoryCompetitions: z.array(z.object({ id: z.string(), status: z.string(), format: z.string(), category: z.object({ name: z.string(), tournament: z.object({ id: z.string(), name: z.string() }).strict() }).strict() }).strict()),
}).strict();
export type TournamentRankingWorkspace = z.infer<typeof tournamentRankingWorkspaceSchema>;
