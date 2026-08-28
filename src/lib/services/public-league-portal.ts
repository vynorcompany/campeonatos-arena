import { prisma } from "@/lib/prisma";

function dateTimeLabel(value: Date) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value); }

export async function getPublicLeaguePortal(arenaSlug: string, playerId: string) {
  const arena = await prisma.arena.findUnique({ where: { slug: arenaSlug }, select: { id: true, scheduleStartMinute: true, scheduleEndMinute: true, courts: { where: { active: true }, include: { weeklyRules: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] } } });
  if (!arena) return null;
  const ownPairs = await prisma.categoryPair.findMany({ where: { active: true, players: { some: { playerId } }, competition: { format: "LEAGUE", status: { in: ["PUBLISHED", "FINISHED"] }, category: { tournament: { arenaId: arena.id } } } }, include: { group: true, competition: { include: { category: { include: { tournament: true } } } }, players: { include: { player: { select: { id: true, name: true } } } }, homeMatches: { include: { awayPair: { select: { id: true, name: true, groupId: true } }, leagueCycle: { select: { id: true } } } }, awayMatches: { include: { homePair: { select: { id: true, name: true, groupId: true } } } } }, orderBy: { createdAt: "asc" } });
  const challenges = await prisma.leagueMatchProposal.findMany({ where: { OR: [{ proposerPairId: { in: ownPairs.map((pair) => pair.id) } }, { opponentPairId: { in: ownPairs.map((pair) => pair.id) } }] }, include: { court: { select: { name: true } }, categoryMatch: { include: { homePair: { select: { name: true } }, awayPair: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } });
  const [notifications, medicalRequests, replacementPlayers, prizes] = await Promise.all([
    prisma.playerNotification.findMany({ where: { playerId, readAt: null }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, title: true, message: true, href: true } }),
    prisma.leagueMedicalSubstitutionRequest.findMany({ where: { requestedByPlayerId: playerId, status: "PENDING" }, select: { pairId: true } }),
    prisma.player.findMany({ where: { arenaId: arena.id, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.leagueCycle.findMany({ where: { status: "OPEN", competition: { category: { tournament: { arenaId: arena.id } } }, prizeDescription: { not: "" } }, include: { competition: { include: { category: { include: { tournament: true } } } } }, orderBy: { referenceMonth: "desc" } }),
  ]);
  const now = new Date();
  const occurrences = await prisma.scheduleOccurrence.findMany({ where: { arenaId: arena.id, status: { not: "CANCELED" }, startsAt: { gte: now, lt: new Date(now.getTime() + 8 * 24 * 60 * 60_000) } }, include: { occurrenceCourts: true } });
  const slots = arena.courts.flatMap((court) => Array.from({ length: 7 }, (_, dayOffset) => {
    const date = new Date(now); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + dayOffset);
    const rule = court.weeklyRules.find((item) => item.weekday === date.getDay() && item.available);
    if (!rule) return [];
    const duration = court.onlineDurationMinutes[0] ?? 60;
    return Array.from({ length: Math.max(0, Math.floor((rule.endsAtMinute - rule.startsAtMinute - duration) / court.onlineSlotMinutes) + 1) }, (_, index) => rule.startsAtMinute + index * court.onlineSlotMinutes).flatMap((minute) => {
      const startsAt = new Date(date); startsAt.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
      const endsAt = new Date(startsAt.getTime() + duration * 60_000);
      if (startsAt <= now || occurrences.some((occurrence) => occurrence.occurrenceCourts.some((entry) => entry.courtId === court.id) && occurrence.startsAt < endsAt && occurrence.endsAt > startsAt)) return [];
      return [{ value: `${court.id}|${startsAt.toISOString()}|${duration}`, label: `${court.name} · ${dateTimeLabel(startsAt)} · ${duration / 60}h` }];
    });
  })).flat();
  return {
    pairs: ownPairs.map((pair) => ({ id: pair.id, name: pair.name, categoryName: pair.competition.category.name, eventName: pair.competition.category.tournament.name, groupName: pair.group?.name ?? "", players: pair.players.map((entry) => ({ id: entry.player.id, name: entry.player.name })), medicalRequestPending: medicalRequests.some((request) => request.pairId === pair.id), opponents: pair.homeMatches.filter((match) => !match.winnerPairId && match.leagueCycleId).map((match) => ({ matchId: match.id, pair: match.awayPair, block: match.leagueBlock })).filter((item): item is { matchId: string; block: number | null; pair: { id: string; name: string; groupId: string | null } } => Boolean(item.pair) && item.pair!.id !== pair.id && (!pair.groupId || item.pair!.groupId === pair.groupId)).map((item) => ({ matchId: item.matchId, id: item.pair.id, name: item.pair.name, block: item.block })) })),
    challenges: challenges.map((challenge) => ({ id: challenge.id, status: challenge.status, opponent: challenge.categoryMatch.awayPair?.name ?? "Dupla visitante", proposer: challenge.categoryMatch.homePair?.name ?? "Dupla mandante", court: challenge.court.name, proposedAt: dateTimeLabel(challenge.startsAt), responseDueAt: dateTimeLabel(challenge.responseDueAt), block: challenge.categoryMatch.leagueBlock, incoming: ownPairs.some((pair) => pair.id === challenge.opponentPairId) })),
    notifications,
    slots,
    replacementPlayers,
    prizes: prizes.map((cycle) => ({ id: cycle.id, eventName: cycle.competition.category.tournament.name, categoryName: cycle.competition.category.name, description: cycle.prizeDescription })),
  };
}
