import "server-only";
import { requireModuleView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";
import { arenaDatabase } from "@/lib/arena-database";
import { historicalMatchSummary, historicalPairs, historicalStandings } from "@/lib/league/history";
import { leagueReferenceMonth } from "@/lib/league/reference-month";
import { tournamentCategoryQuerySchema, tournamentCategoryWorkspaceSchema } from "../contracts/tournament-category-workspace";
function snapshotChampionName(snapshot: unknown, championPairId: string | null) {
 if (!championPairId || !snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
 const pairs = (snapshot as { pairs?: unknown }).pairs;
 if (!Array.isArray(pairs)) return null;
 const champion = pairs.find(pair => pair && typeof pair === "object" && "id" in pair && pair.id === championPairId);
 return champion && typeof champion.name === "string" ? champion.name : null;
}
export async function resolveTournamentCategoryWorkspace(input: unknown) {
 const { tournamentId, categoryId } = tournamentCategoryQuerySchema.parse(input), auth = await requireModuleView("tournaments");
 const canManage = canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions), canRecordResults = canPerformPermission("tournaments:results", auth.arenaRole, auth.systemRole, auth.editPermissions);
 if (!canManage && !canRecordResults) throw Error("Sem permissão para consultar a categoria.");
 const currentReferenceMonth = leagueReferenceMonth(new Date()), db = arenaDatabase(auth.arenaId);
 const empty = (redirectToGames = false) => tournamentCategoryWorkspaceSchema.parse({ category: null, redirectToGames, currentReferenceMonth, athletes: [], pairRankings: [], medicalRequests: [], individualAccounts: [] });
 const registrationScope = { tournamentId, tournament: { arenaId: auth.arenaId }, ...(!canManage ? { id: { in: [] as string[] } } : {}) };
 const members = { where: { player: { arenaId: auth.arenaId } }, orderBy: { slot: "asc" as const }, select: { player: { select: { id: true as const, name: true as const } } } };
 const category = await db.tournamentCategory.findFirst({
  where: { id: categoryId, tournamentId, tournament: { arenaId: auth.arenaId } },
  select: {
   id: true, name: true, class: true, gender: true, registrationType: true, active: true, archivedAt: true, maxRegistrations: true, priceFirstCents: true, priceSecondCents: true, priceThirdCents: true, allowedRegistrationCategoryIds: true,
   _count: { select: { registrations: { where: registrationScope } } },
   tournament: { select: { id: true, name: true, creationMode: true, categories: { where: { archivedAt: null }, select: { id: true, name: true, standardKey: true } } } },
   registrations: { where: { ...registrationScope, status: { not: "CANCELED" } }, orderBy: { createdAt: "desc" }, select: { id: true, leadName: true, partnerName: true, status: true, paymentStatus: true } },
   competition: { select: {
    id: true, format: true, leagueTier: true, status: true, isPublic: true, feedsGeneralRanking: true, registrationFeeCents: true,
    ranking: { select: { id: true, name: true, arenaId: true } },
    leagueCycles: { orderBy: { referenceMonth: "desc" }, select: { id: true, referenceMonth: true, status: true, prizeDescription: true, snapshot: true, championPairId: true, promotedPairId: true, relegatedPairId: true, matches: { where: { competition: { categoryId, category: { tournamentId, tournament: { arenaId: auth.arenaId } } } }, select: { homePairId: true, awayPairId: true, winnerPairId: true, homeScore: true, awayScore: true, manualStatus: true, woReason: true } } } },
    pairs: { where: { active: true, players: { every: { player: { arenaId: auth.arenaId } } } }, orderBy: { drawOrder: "asc" }, select: { id: true, name: true, groupId: true, players: members } },
    groups: { orderBy: { drawOrder: "asc" }, select: { id: true, name: true, pairs: { where: { players: { every: { player: { arenaId: auth.arenaId } } } }, orderBy: { drawOrder: "asc" }, select: { id: true, name: true } } } },
    matches: { orderBy: { roundOrder: "asc" }, select: {
     id: true, label: true, stage: true, roundOrder: true, courtName: true, scheduledDate: true, scheduledTime: true, homePairId: true, awayPairId: true, winnerPairId: true,
     homeScore: true, awayScore: true, homeSet1: true, awaySet1: true, homeSet2: true, awaySet2: true, homeSet3: true, awaySet3: true, manualStatus: true, leagueBlock: true, woReason: true,
     homePair: { select: { id: true, name: true, players: members } }, awayPair: { select: { id: true, name: true, players: members } }, winnerPair: { select: { id: true, name: true } },
     trioGames: { orderBy: { gameNumber: "asc" }, select: { id: true, gameNumber: true, homePlayerIds: true, awayPlayerIds: true, homeScore: true, awayScore: true } },
    } },
   } },
  },
 });
 if (!category || category.archivedAt && !canManage) return empty();
 if (category.registrationType === "INDIVIDUAL" && !canManage) return empty(true);
 const [athletes, pairRankings, medicalRequests, individualAccounts] = canManage && !category.archivedAt ? await Promise.all([
  db.player.findMany({ where: { arenaId: auth.arenaId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, active: true, class: true, gender: true, leagueAthleteTiers: { where: { arenaId: auth.arenaId, active: true, modality: "PADEL" }, orderBy: { changedAt: "desc" }, take: 1, select: { tier: true } } } }),
  db.rankingProfile.findMany({ where: { arenaId: auth.arenaId, active: true, type: "PAIR" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  category.competition?.format === "LEAGUE" ? db.leagueMedicalSubstitutionRequest.findMany({ where: { status: "PENDING", pair: { competition: { categoryId, category: { tournamentId, tournament: { arenaId: auth.arenaId } } } } }, select: { id: true, reason: true, requestedAt: true, previousPlayerId: true, replacementPlayerId: true, pair: { select: { name: true } } } }) : Promise.resolve([]),
  category.registrationType === "INDIVIDUAL" ? db.bankAccount.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true } }) : Promise.resolve([]),
 ]) : [[], [], [], []];
 const competition = category.competition;
 return tournamentCategoryWorkspaceSchema.parse({ category: { ...category, registrations: canManage ? category.registrations : [], _count: { registrations: canManage ? category._count.registrations : 0 }, archivedAt: category.archivedAt?.toISOString() ?? null, competition: competition ? {
  ...competition, ranking: competition.ranking?.arenaId === auth.arenaId ? { id: competition.ranking.id, name: competition.ranking.name } : null,
  matches: competition.matches.map(match => ({ ...match, trioGames: match.trioGames.map(game => ({ ...game, homePlayerIds: game.homePlayerIds.filter(id => match.homePair?.players.some(member => member.player.id === id)), awayPlayerIds: game.awayPlayerIds.filter(id => match.awayPair?.players.some(member => member.player.id === id)) })) })),
  leagueCycles: competition.leagueCycles.map((cycle, index) => {
   const summary = historicalMatchSummary(cycle.snapshot, cycle.matches), archivedPairs = historicalPairs(cycle.snapshot), archivedName = (pairId: string | null) => archivedPairs.find(pair => pair.id === pairId)?.name ?? null;
   const sections = cycle.snapshot && typeof cycle.snapshot === "object" && !Array.isArray(cycle.snapshot) ? cycle.snapshot as Record<string, unknown> : null;
   const successor = competition.leagueCycles[0], emptySnapshot = Boolean(sections) && ["pairs", "groups", "matches", "registrations"].every(key => Array.isArray(sections?.[key]) && (sections?.[key] as unknown[]).length === 0);
   const canReopen = canManage && index === 1 && cycle.status === "CLOSED" && cycle.referenceMonth === currentReferenceMonth && successor?.status === "OPEN" && successor.matches.length === 0 && emptySnapshot && !cycle.championPairId && !cycle.promotedPairId && !cycle.relegatedPairId;
   return { id: cycle.id, referenceMonth: cycle.referenceMonth, status: cycle.status, prizeDescription: cycle.prizeDescription, history: { ...summary, championPairId: cycle.championPairId, championName: snapshotChampionName(cycle.snapshot, cycle.championPairId), promotedPairId: cycle.promotedPairId, promotedName: archivedName(cycle.promotedPairId), relegatedPairId: cycle.relegatedPairId, relegatedName: archivedName(cycle.relegatedPairId), standings: historicalStandings(cycle.snapshot, cycle.matches), canReopen } };
  }),
 } : null }, redirectToGames: false, currentReferenceMonth, athletes, pairRankings, individualAccounts,
 medicalRequests: medicalRequests.map(request => ({ id: request.id, reason: request.reason, requestedAt: request.requestedAt.toISOString(), pairName: request.pair.name, previousPlayerName: athletes.find(athlete => athlete.id === request.previousPlayerId)?.name ?? "Atleta anterior", replacementPlayerName: athletes.find(athlete => athlete.id === request.replacementPlayerId)?.name ?? "Novo atleta" })),
 });
}
