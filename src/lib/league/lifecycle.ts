import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { buildMonthlyLeagueSchedule, getLeagueMonthBlocks } from "@/lib/league/monthly-schedule";
import { resolveLeagueTier } from "@/lib/league/tier";

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const nextMonthKey = (referenceMonth: string) => {
  const [year, month] = referenceMonth.split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
};
const monthBounds = (referenceMonth: string) => {
  const [year, month] = referenceMonth.split("-").map(Number);
  return { startsAt: new Date(year, month - 1, 1), endsAt: new Date(year, month, 1) };
};

function standings(matches: Array<{ homePairId: string | null; awayPairId: string | null; winnerPairId: string | null; homeScore: number | null; awayScore: number | null }>) {
  const rows = new Map<string, { pairId: string; points: number; wins: number; differential: number }>();
  for (const match of matches) {
    if (!match.homePairId || !match.awayPairId) continue;
    for (const pairId of [match.homePairId, match.awayPairId]) if (!rows.has(pairId)) rows.set(pairId, { pairId, points: 0, wins: 0, differential: 0 });
    const home = rows.get(match.homePairId)!;
    const away = rows.get(match.awayPairId)!;
    home.differential += (match.homeScore ?? 0) - (match.awayScore ?? 0);
    away.differential += (match.awayScore ?? 0) - (match.homeScore ?? 0);
    if (match.winnerPairId) {
      const winner = rows.get(match.winnerPairId)!;
      winner.wins += 1;
      winner.points += 2;
    }
  }
  return [...rows.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || b.differential - a.differential || a.pairId.localeCompare(b.pairId));
}

async function applyWo(matchId: string, winnerPairId: string | null, reason: "HOST_NO_PROPOSAL" | "VISITOR_NO_RESPONSE" | "THREE_REJECTIONS" | "DOUBLE_WO") {
  const match = await prisma.categoryMatch.findUnique({ where: { id: matchId }, select: { homePairId: true, awayPairId: true } });
  if (!match?.homePairId || !match.awayPairId) return;
  const homeWins = winnerPairId === match.homePairId;
  await prisma.$transaction(async (tx) => {
    await tx.categoryMatch.update({ where: { id: matchId }, data: {
      homeScore: winnerPairId ? (homeWins ? 2 : 0) : 0,
      awayScore: winnerPairId ? (homeWins ? 0 : 2) : 0,
      winnerPairId,
      manualStatus: "FINISHED",
      woReason: reason,
    } });
    if (reason === "DOUBLE_WO") {
      await tx.categoryPair.updateMany({ where: { id: { in: [match.homePairId!, match.awayPairId!] } }, data: { totalPoints: { decrement: 2 } } });
    }
  });
}

/** Processes missed response deadlines and blocks. It is safe to invoke repeatedly from a cron job. */
export async function processLeagueDeadlines(now = new Date(), arenaId?: string) {
  const unresolved = await prisma.categoryMatch.findMany({
    where: { leagueCycle: { status: "OPEN" }, winnerPairId: null, competition: { format: "LEAGUE", ...(arenaId ? { category: { tournament: { arenaId } } } : {}) } },
    select: { id: true, homePairId: true, awayPairId: true, hostProposalDeadline: true, proposals: { orderBy: { createdAt: "desc" }, select: { status: true, responseDueAt: true } } },
  });
  let resolved = 0;
  for (const match of unresolved) {
    if (!match.homePairId || !match.awayPairId) continue;
    const pending = match.proposals.find((proposal) => proposal.status === "PENDING");
    if (pending && pending.responseDueAt <= now) {
      await applyWo(match.id, match.homePairId, "VISITOR_NO_RESPONSE"); resolved += 1; continue;
    }
    if (match.proposals.length >= 3 && match.proposals.every((proposal) => proposal.status === "REJECTED")) {
      await applyWo(match.id, match.homePairId, "THREE_REJECTIONS"); resolved += 1; continue;
    }
    if (!match.proposals.length && match.hostProposalDeadline && match.hostProposalDeadline <= now) {
      await applyWo(match.id, match.awayPairId, "HOST_NO_PROPOSAL"); resolved += 1;
    }
  }
  return { resolved };
}

async function createMonthlyCycle(competitionId: string, referenceMonth: string) {
  const competition = await prisma.categoryCompetition.findUnique({
    where: { id: competitionId },
    include: { pairs: { where: { active: true }, orderBy: { drawOrder: "asc" }, select: { id: true, groupId: true } }, groups: { orderBy: { drawOrder: "asc" }, select: { id: true, name: true } } },
  });
  if (!competition || competition.format !== "LEAGUE") return null;
  const existing = await prisma.leagueCycle.findUnique({ where: { competitionId_referenceMonth: { competitionId, referenceMonth } } });
  if (existing) return existing;
  const [year, month] = referenceMonth.split("-").map(Number);
  const blocks = getLeagueMonthBlocks(year, month);
  const cycle = await prisma.leagueCycle.create({ data: { competitionId, referenceMonth } });
  if (!competition.pairs.length) return cycle;
  const groupId = competition.groups[0]?.id ?? null;
  const schedule = buildMonthlyLeagueSchedule(competition.pairs.map((pair) => pair.id));
  await prisma.categoryMatch.createMany({ data: schedule.matches.map((match, index) => ({
    competitionId,
    groupId,
    stage: "GROUP",
    label: `Semana ${match.blockNumber} · Jogo ${index + 1}`,
    roundOrder: index + 1,
    homePairId: match.homePairId,
    awayPairId: match.awayPairId,
    leagueCycleId: cycle.id,
    leagueBlock: match.blockNumber,
    hostProposalDeadline: new Date(`${blocks[match.blockNumber - 1].endsOn}T23:59:59.999`),
  })) });
  return cycle;
}

async function snapshotLeagueCycle(competitionId: string, cycleId: string) {
  const competition = await prisma.categoryCompetition.findUnique({
    where: { id: competitionId },
    include: {
      category: { include: { registrations: { select: { id: true, leadName: true, partnerName: true, status: true, paymentStatus: true, createdAt: true } } } },
      pairs: { include: { players: { include: { player: { select: { name: true } } } } } },
      groups: { include: { pairs: { select: { id: true, name: true } } } },
      matches: { include: { homePair: { select: { name: true } }, awayPair: { select: { name: true } }, winnerPair: { select: { name: true } } } },
      leagueCycles: { where: { id: cycleId }, include: { matches: { include: { homePair: { select: { name: true } }, awayPair: { select: { name: true } }, winnerPair: { select: { name: true } } } } } }
    }
  });
  if (!competition) return;
  const pairs = competition.pairs.map((pair) => ({ id: pair.id, name: pair.name, players: pair.players.map((player) => player.player.name) }));
  const groups = competition.groups.map((group) => ({ id: group.id, name: group.name, pairs: group.pairs.map((pair) => ({ id: pair.id, name: pair.name })) }));
  const registrations = competition.category.registrations.map((registration) => ({ id: registration.id, leadName: registration.leadName, partnerName: registration.partnerName, status: registration.status, paymentStatus: registration.paymentStatus, createdAt: registration.createdAt.toISOString() }));
  await prisma.$transaction(competition.leagueCycles.map((cycle) => {
    const matches = cycle.matches.length ? cycle.matches : competition.matches.filter((match) => match.leagueCycleId === null);
    return prisma.leagueCycle.update({
      where: { id: cycle.id },
      data: { snapshot: {
        pairs,
        groups,
        registrations,
        matches: matches.map((match) => ({ label: match.label, stage: match.stage, roundOrder: match.roundOrder, homePair: match.homePair?.name ?? null, awayPair: match.awayPair?.name ?? null, winnerPair: match.winnerPair?.name ?? null, homeScore: match.homeScore, awayScore: match.awayScore, scheduledDate: match.scheduledDate, scheduledTime: match.scheduledTime, woReason: match.woReason }))
      } as Prisma.InputJsonValue }
    });
  }));
}

async function resetLeagueCompetition(competitionId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.publicTournamentRegistration.updateMany({ where: { competitionId }, data: { status: "CANCELED" } });
    await tx.categoryMatch.deleteMany({ where: { competitionId } });
    await tx.categoryPair.deleteMany({ where: { competitionId } });
    await tx.categoryGroup.deleteMany({ where: { competitionId } });
    await tx.categoryCompetition.update({ where: { id: competitionId }, data: { status: "DRAFT" } });
  });
}

function tierOf(competition: { leagueTier: string; category: { name: string } }) {
  return resolveLeagueTier(competition.category.name, competition.leagueTier);
}

const leagueModality = "PADEL";

async function syncLeagueAthleteTiers(
  tx: Prisma.TransactionClient,
  input: { arenaId: string; playerIds: string[]; tier: "A" | "B"; cycleId: string },
) {
  const playerIds = Array.from(new Set(input.playerIds));
  if (!playerIds.length) return;
  const current = await tx.leagueAthleteTier.findMany({
    where: { arenaId: input.arenaId, modality: leagueModality, playerId: { in: playerIds }, active: true },
    select: { id: true, playerId: true, tier: true },
  });
  const unchanged = new Set(current.filter((item) => item.tier === input.tier).map((item) => item.playerId));
  const changedIds = playerIds.filter((playerId) => !unchanged.has(playerId));
  if (!changedIds.length) return;
  await tx.leagueAthleteTier.updateMany({
    where: { arenaId: input.arenaId, modality: leagueModality, playerId: { in: changedIds }, active: true },
    data: { active: false },
  });
  await tx.leagueAthleteTier.createMany({
    data: changedIds.map((playerId) => ({ arenaId: input.arenaId, playerId, tier: input.tier, modality: leagueModality, leagueCycleId: input.cycleId })),
  });
}

async function applyPromotionAndRelegation(cycleId: string) {
  const cycle = await prisma.leagueCycle.findUnique({
    where: { id: cycleId },
    include: {
      competition: { include: { category: { include: { tournament: { select: { id: true, arenaId: true } } } }, pairs: { where: { active: true }, include: { players: { select: { playerId: true } } } } } },
      matches: true,
    },
  });
  if (!cycle) return;
  const tier = tierOf(cycle.competition);
  if (tier === "A" || tier === "B") {
    await prisma.$transaction((tx) => syncLeagueAthleteTiers(tx, {
      arenaId: cycle.competition.category.tournament.arenaId,
      playerIds: cycle.competition.pairs.flatMap((pair) => pair.players.map((player) => player.playerId)),
      tier,
      cycleId: cycle.id,
    }));
  }
  const table = standings(cycle.matches);
  const championPairId = table[0]?.pairId ?? null;
  const relegatedPairId = tier === "A" ? table.at(-1)?.pairId ?? null : null;
  const updates: { championPairId: string | null; promotedPairId?: string | null; relegatedPairId?: string | null } = { championPairId, ...(tier === "A" ? { relegatedPairId } : {}) };
  if (tier === "B" && championPairId) updates.promotedPairId = championPairId;
  await prisma.leagueCycle.update({ where: { id: cycle.id }, data: updates });
  if (!tier || !championPairId && !relegatedPairId) return;
  const siblings = await prisma.categoryCompetition.findMany({ where: { format: "LEAGUE", category: { tournamentId: cycle.competition.category.tournament.id } }, include: { category: { select: { name: true } } } });
  const a = siblings.find((item) => tierOf(item) === "A");
  const b = siblings.find((item) => tierOf(item) === "B");
  const movePair = async (pairId: string, targetCompetitionId: string, targetTier: "A" | "B") => {
    const pair = cycle.competition.pairs.find((item) => item.id === pairId);
    if (!pair || targetCompetitionId === cycle.competitionId) return;
    await prisma.$transaction(async (tx) => {
      await tx.categoryPair.update({ where: { id: pair.id }, data: { active: false } });
      await tx.categoryPair.create({ data: { name: pair.name, totalPoints: 0, active: true, competitionId: targetCompetitionId, players: { create: pair.players.map((player, slot) => ({ playerId: player.playerId, competitionId: targetCompetitionId, slot: slot + 1 })) } } });
      await syncLeagueAthleteTiers(tx, { arenaId: cycle.competition.category.tournament.arenaId, playerIds: pair.players.map((player) => player.playerId), tier: targetTier, cycleId: cycle.id });
    });
  };
  if (tier === "A" && relegatedPairId && b) await movePair(relegatedPairId, b.id, "B");
  if (tier === "B" && championPairId && a) await movePair(championPairId, a.id, "A");
}

/** Finalizes all past open cycles, keeps their matches as history, and opens the next monthly cycle. */
export async function closeExpiredLeagueCycles(now = new Date(), arenaId?: string) {
  await processLeagueDeadlines(now, arenaId);
  const currentMonth = monthKey(now);
  const cycles = await prisma.leagueCycle.findMany({ where: { status: "OPEN", referenceMonth: { lt: currentMonth }, ...(arenaId ? { competition: { category: { tournament: { arenaId } } } } : {}) }, select: { id: true, competitionId: true } });
  for (const cycle of cycles) {
    const unresolved = await prisma.categoryMatch.findMany({ where: { leagueCycleId: cycle.id, winnerPairId: null }, select: { id: true } });
    for (const match of unresolved) await applyWo(match.id, null, "DOUBLE_WO");
    await applyPromotionAndRelegation(cycle.id);
    await snapshotLeagueCycle(cycle.competitionId, cycle.id);
    await prisma.leagueCycle.update({ where: { id: cycle.id }, data: { status: "CLOSED", closedAt: now } });
    await resetLeagueCompetition(cycle.competitionId);
    await createMonthlyCycle(cycle.competitionId, currentMonth);
  }
  return { closedCycles: cycles.length };
}

/** Manually closes the current cycle of one League and opens its next monthly cycle. */
export async function closeLeagueCycleManually(competitionId: string, now = new Date(), arenaId?: string) {
  const referenceMonth = monthKey(now);
  const cycle = await prisma.leagueCycle.findFirst({
    where: {
      competitionId,
      referenceMonth,
      status: "OPEN",
      ...(arenaId ? { competition: { category: { tournament: { arenaId } } } } : {})
    },
    select: { id: true, competitionId: true, referenceMonth: true }
  });
  if (!cycle) throw new Error("Não há um ciclo aberto desta Liga para encerrar.");

  await processLeagueDeadlines(now, arenaId);
  const unresolved = await prisma.categoryMatch.findMany({ where: { leagueCycleId: cycle.id, winnerPairId: null }, select: { id: true } });
  for (const match of unresolved) await applyWo(match.id, null, "DOUBLE_WO");
  await applyPromotionAndRelegation(cycle.id);
  await snapshotLeagueCycle(cycle.competitionId, cycle.id);
  await prisma.leagueCycle.update({ where: { id: cycle.id }, data: { status: "CLOSED", closedAt: now } });
  await resetLeagueCompetition(cycle.competitionId);
  await createMonthlyCycle(cycle.competitionId, nextMonthKey(cycle.referenceMonth));
  return { closedCycles: 1, nextReferenceMonth: nextMonthKey(cycle.referenceMonth) };
}

export { createMonthlyCycle, monthBounds, syncLeagueAthleteTiers };
