import { z } from "zod";
const id = z.string().min(1).max(100), text = z.string(), nullableText = text.nullable(), score = z.number().int().nullable();
const option = z.object({ id: text, name: text }).strict();
const member = z.object({ player: option }).strict();
export const tournamentCategoryQuerySchema = z.object({ tournamentId: id, categoryId: id }).strict();
const standing = z.object({ pairId: text, pairName: text, played: z.number().int(), victories: z.number().int(), differential: z.number().int() }).strict();
const cycle = z.object({
 id: text, referenceMonth: text, status: text, prizeDescription: text,
 history: z.object({ completedMatches: z.number().int(), matchCount: z.number().int(), championPairId: nullableText, championName: nullableText, promotedPairId: nullableText, promotedName: nullableText, relegatedPairId: nullableText, relegatedName: nullableText, standings: z.array(standing), canReopen: z.boolean() }).strict(),
}).strict();
const match = z.object({
 id: text, label: text, stage: text, roundOrder: z.number().int(), courtName: nullableText, scheduledDate: nullableText, scheduledTime: nullableText,
 homePairId: nullableText, awayPairId: nullableText, winnerPairId: nullableText, homeScore: score, awayScore: score, homeSet1: score, awaySet1: score, homeSet2: score, awaySet2: score, homeSet3: score, awaySet3: score,
 manualStatus: nullableText, leagueBlock: score, woReason: nullableText,
 homePair: option.safeExtend({ players: z.array(member) }).nullable(), awayPair: option.safeExtend({ players: z.array(member) }).nullable(), winnerPair: option.nullable(),
 trioGames: z.array(z.object({ id: text, gameNumber: z.number().int(), homePlayerIds: z.array(text), awayPlayerIds: z.array(text), homeScore: score, awayScore: score }).strict()),
}).strict();
export const tournamentCategoryWorkspaceSchema = z.object({
 redirectToGames: z.boolean(), currentReferenceMonth: text,
 category: z.object({
  id: text, name: text, class: text, gender: text, registrationType: text, active: z.boolean(), archivedAt: z.iso.datetime().nullable(), maxRegistrations: z.number().int(), priceFirstCents: z.number().int(), priceSecondCents: z.number().int(), priceThirdCents: z.number().int(), allowedRegistrationCategoryIds: z.array(text),
  _count: z.object({ registrations: z.number().int() }).strict(),
  tournament: z.object({ id: text, name: text, creationMode: text, categories: z.array(option.safeExtend({ standardKey: text })) }).strict(),
  registrations: z.array(z.object({ id: text, leadName: text, partnerName: text, status: text, paymentStatus: text }).strict()),
  competition: z.object({
   id: text, format: z.enum(["LEAGUE","THREE_GROUPS","FOUR_GROUPS","SIMPLE","TRIO"]), leagueTier: text, status: text, isPublic: z.boolean(), feedsGeneralRanking: z.boolean(), registrationFeeCents: z.number().int(), ranking: option.nullable(), leagueCycles: z.array(cycle),
   pairs: z.array(option.safeExtend({ groupId: nullableText, players: z.array(member) })),
   groups: z.array(option.safeExtend({ pairs: z.array(option) })), matches: z.array(match),
  }).strict().nullable(),
 }).strict().nullable(),
 athletes: z.array(option.safeExtend({ active: z.boolean(), class: text, gender: text, leagueAthleteTiers: z.array(z.object({ tier: text }).strict()) })),
 pairRankings: z.array(option), medicalRequests: z.array(z.object({ id: text, reason: text, requestedAt: z.iso.datetime(), pairName: text, previousPlayerName: text, replacementPlayerName: text }).strict()), individualAccounts: z.array(option),
}).strict();
