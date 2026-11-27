import { z } from "zod";
export const tournamentWorkspaceQuerySchema = z.object({ view: z.enum(["categories", "games", "overview"]), tournamentId: z.string().min(1).max(100) }).strict();
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

const overviewCategory = z.object({
 id: z.string(), name: z.string(), registrationType: z.string(), _count: z.object({ registrations: z.number().int().nonnegative() }).strict(),
 competition: z.object({ format: z.enum(["LEAGUE", "THREE_GROUPS", "FOUR_GROUPS", "SIMPLE", "TRIO"]), status: z.string(), _count: z.object({ pairs: z.number().int().nonnegative() }).strict() }).strict().nullable(),
}).strict();
export const tournamentOverviewSchema = z.object({ view: z.literal("overview"), tournament: z.object({
 id: z.string(), name: z.string(), description: z.string(), rules: z.string(), onlinePaymentEnabled: z.boolean(), publicSlug: z.string(), registrationPhase: z.string(), creationMode: z.string(),
 createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(), firstBonusLimit: z.number().int(), firstBonusUntil: z.iso.datetime().nullable(),
 arena: z.object({ slug: z.string() }).strict(), categories: z.array(overviewCategory),
 publicRegistrations: z.array(z.object({ id: z.string(), leadName: z.string(), partnerName: z.string(), createdAt: z.iso.datetime() }).strict()),
}).strict().nullable() }).strict();
