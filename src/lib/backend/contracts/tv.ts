import {z} from "zod";
export const tvViewSchema=z.enum(["presentation","settings"]);
export type TvView=z.infer<typeof tvViewSchema>;
export const tvMatchSchema=z.object({id:z.string(),displayOrder:z.number().int(),homePairName:z.string(),awayPairName:z.string(),courtName:z.string(),scheduledTime:z.string(),status:z.string()}).strict();
const ranked=z.object({id:z.string(),name:z.string(),points:z.number()}).strict();
const sponsor=z.object({id:z.string(),name:z.string(),subtitle:z.string(),logoUrl:z.string(),displayOrder:z.number().int()}).strict();
export const tvPayloadSchema=z.object({
 matches:z.array(tvMatchSchema),
 settings:z.object({slideIntervalSeconds:z.number().int(),selectedTournamentId:z.string(),tvSourceTournamentId:z.string(),tvMatchSource:z.enum(["MANUAL","TOURNAMENT"]),selectedRankingIds:z.array(z.string()),selectedSponsorIds:z.array(z.string()),selectedTournamentName:z.string(),showMatches:z.boolean(),showCalendar:z.boolean(),showSponsors:z.boolean(),showRanking:z.boolean(),showMonthlyPrize:z.boolean(),showNightWinner:z.boolean(),monthlyPrizeTitle:z.string(),monthlyPrizeAmount:z.string(),monthlyPrizeDescription:z.string(),nightWinnerTitle:z.string(),nightWinnerName:z.string(),nightWinnerDescription:z.string()}).strict(),
 sponsors:z.array(sponsor),availableSponsors:z.array(sponsor),ranking:z.array(ranked),rankingSlides:z.array(z.object({id:z.string(),title:z.string(),entries:z.array(ranked)}).strict()),
 calendar:z.object({rangeLabel:z.string(),items:z.array(z.object({id:z.string(),title:z.string(),meta:z.string(),dateLabel:z.string(),timeLabel:z.string(),typeLabel:z.string()}).strict())}).strict(),
}).strict();
export const tvWorkspaceSchema=z.object({payload:tvPayloadSchema,arenaLogoUrl:z.string(),manualMatches:z.array(tvMatchSchema),tournaments:z.array(z.object({id:z.string(),name:z.string(),status:z.string()}).strict()),leagueCycles:z.array(z.object({id:z.string(),prizeDescription:z.string(),competition:z.object({category:z.object({name:z.string()}).strict()}).strict()}).strict())}).strict();
