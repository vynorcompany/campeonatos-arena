import type { Prisma } from "@prisma/client";

// Public visibility belongs to the category, independently of its game format.
// An athlete may also consult their own active league even when it is private.
export function portalEventCompetitionWhere(arenaId: string, playerIds: readonly string[]): Prisma.CategoryCompetitionWhereInput {
  return {
    category: { active: true, archivedAt: null, tournament: { arenaId } },
    OR: [
      { isPublic: true },
      {
        format: "LEAGUE",
        status: { not: "FINISHED" },
        pairs: { some: { active: true, players: { some: { playerId: { in: [...playerIds] } } } } },
      },
    ],
  };
}
