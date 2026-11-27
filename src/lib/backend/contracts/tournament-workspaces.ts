import { z } from "zod";
export const tournamentWorkspaceQuerySchema = z.object({ view: z.enum(["categories", "games"]), tournamentId: z.string().min(1).max(100) }).strict();
const tournament = z.object({ id: z.string(), name: z.string() }).strict().nullable();
export const tournamentCategoriesSchema = z.object({
 view: z.literal("categories"), tournament,
 categories: z.array(z.object({ id: z.string(), name: z.string(), registrationType: z.string(), registrationCount: z.number().int().nonnegative(), competition: z.object({ format: z.string(), pairCount: z.number().int().nonnegative() }).strict().nullable() }).strict()),
}).strict();
const pair = z.object({ name: z.string() }).strict().nullable();
export const tournamentGamesSchema = z.object({
 view: z.literal("games"), tournament, courts: z.array(z.object({ name: z.string() }).strict()),
 matches: z.array(z.object({ id: z.string(), label: z.string(), scheduledDate: z.string().nullable(), scheduledTime: z.string().nullable(), courtName: z.string().nullable(), competition: z.object({ category: z.object({ name: z.string() }).strict() }).strict(), homePair: pair, awayPair: pair }).strict()),
}).strict();
