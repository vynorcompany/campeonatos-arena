import { z } from "zod";
export const tournamentDirectoryQuerySchema = z.object({
  status: z.literal("finished").optional(), tournamentId: z.string().min(1).max(100).optional(),
}).strict();
export type TournamentDirectoryQuery = z.infer<typeof tournamentDirectoryQuerySchema>;
const category = z.object({ id: z.string(), name: z.string(), competition: z.object({ status: z.string() }).strict().nullable() }).strict();
const tournament = z.object({ id: z.string(), name: z.string(), registrationPhase: z.string(), categories: z.array(category) }).strict();
const score = z.number().int().nullable();
const pair = z.object({ name: z.string() }).strict().nullable();
const match = z.object({
 id: z.string(), label: z.string(), scheduledDate: z.string().nullable(), scheduledTime: z.string().nullable(), courtName: z.string().nullable(),
 homeScore: score, awayScore: score, homeSet1: score, awaySet1: score, homeSet2: score, awaySet2: score, homeSet3: score, awaySet3: score,
 competition: z.object({ category: z.object({ name: z.string() }).strict() }).strict(), homePair: pair, awayPair: pair,
}).strict();
export const tournamentDirectorySchema = z.object({ activeTournaments: z.array(tournament), selectedTournamentId: z.string().nullable(), matches: z.array(match) }).strict();
