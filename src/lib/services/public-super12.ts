import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const eventBoardInclude = {
  creator: { select: { id: true, name: true } },
  groups: {
    orderBy: { drawOrder: "asc" },
    include: {
      pairs: {
        orderBy: { drawOrder: "asc" },
        include: {
          players: { orderBy: { slot: "asc" }, include: { player: { select: { id: true, name: true } } } },
        },
      },
      matches: {
        orderBy: { roundOrder: "asc" },
        include: { homePair: { select: { name: true } }, awayPair: { select: { name: true } } },
      },
    },
  },
} satisfies Prisma.Super12EventInclude;

type EventWithBoard = Prisma.Super12EventGetPayload<{ include: typeof eventBoardInclude }>;

function buildStandings(event: NonNullable<EventWithBoard>) {
  return event.groups.map((group) => {
    const rows = group.pairs.map((pair) => ({
      pairId: pair.id,
      name: pair.name,
      played: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      points: 0,
    }));
    const byPair = new Map(rows.map((row) => [row.pairId, row]));

    for (const match of group.matches) {
      if (match.homeScore == null || match.awayScore == null) continue;
      const home = byPair.get(match.homePairId);
      const away = byPair.get(match.awayPairId);
      if (!home || !away) continue;
      home.played += 1; away.played += 1;
      home.pointsFor += match.homeScore; home.pointsAgainst += match.awayScore;
      away.pointsFor += match.awayScore; away.pointsAgainst += match.homeScore;
      if (match.homeScore > match.awayScore) { home.wins += 1; home.points += 3; away.losses += 1; }
      if (match.awayScore > match.homeScore) { away.wins += 1; away.points += 3; home.losses += 1; }
    }

    return {
      id: group.id,
      name: group.name,
      rows: [...rows].sort((left, right) => right.points - left.points || right.wins - left.wins || (right.pointsFor - right.pointsAgainst) - (left.pointsFor - left.pointsAgainst) || right.pointsFor - left.pointsFor || left.name.localeCompare(right.name, "pt-BR")),
    };
  });
}

export async function getPublicSuper12(arenaSlug: string, playerId: string, eventId?: string) {
  const arena = await prisma.arena.findUnique({ where: { slug: arenaSlug }, select: { id: true } });
  if (!arena) return null;
  const visibleWhere = {
    arenaId: arena.id,
    OR: [
      { creatorId: playerId },
      { pairs: { some: { players: { some: { playerId } } } } },
    ],
  };
  const [events, selectedEvent, availablePlayers] = await Promise.all([
    prisma.super12Event.findMany({ where: { ...visibleWhere, status: "ACTIVE" }, select: { id: true, name: true, format: true, createdAt: true, creatorId: true, _count: { select: { pairs: true, matches: true } } }, orderBy: { createdAt: "desc" }, take: 12 }),
    eventId ? prisma.super12Event.findFirst({ where: { id: eventId, ...visibleWhere }, include: eventBoardInclude }) : prisma.super12Event.findFirst({ where: { ...visibleWhere, status: "ACTIVE" }, include: eventBoardInclude, orderBy: { createdAt: "desc" } }),
    prisma.player.findMany({ where: { arenaId: arena.id, active: true }, select: { id: true, name: true, photoUrl: true }, orderBy: { name: "asc" } }),
  ]);

  return {
    events,
    availablePlayers,
    selectedEvent: selectedEvent ? { ...selectedEvent, standings: buildStandings(selectedEvent), isCreator: selectedEvent.creatorId === playerId } : null,
  };
}
