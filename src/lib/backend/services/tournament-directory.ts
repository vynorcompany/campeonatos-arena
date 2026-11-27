import "server-only";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { canPerformPermission, canViewModule } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { tournamentDirectorySchema, type TournamentDirectoryQuery } from "../contracts/tournament-directory";
export async function resolveTournamentDirectory(query: TournamentDirectoryQuery) {
  const auth = await requireArenaAccess();
  const canViewTournaments = canViewModule("tournaments", auth.arenaRole, auth.systemRole, auth.viewPermissions);
  const canReadMatches = canViewModule("matches", auth.arenaRole, auth.systemRole, auth.viewPermissions);
  if (!canViewTournaments && !canReadMatches) throw new Error("Sem permissão para consultar eventos.");
  const canManageTournaments = canViewTournaments && canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const canRecordResults = canViewTournaments && canPerformPermission("tournaments:results", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const activeTournaments = await prisma.tournament.findMany({
    where: { arenaId: auth.arenaId, registrationPhase: query.status === "finished" ? "FINISHED" : { not: "FINISHED" } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, registrationPhase: true, categories: { where: { active: true }, orderBy: { level: "asc" }, select: { id: true, name: true, competition: { select: { status: true } } } } }
  });
  const selectedTournament = activeTournaments.find((event) => event.id === query.tournamentId);
  const matches = selectedTournament && !canManageTournaments && !canRecordResults ? await prisma.categoryMatch.findMany({
    where: { competition: { category: { tournamentId: selectedTournament.id, active: true, tournament: { arenaId: auth.arenaId } } } },
    select: {
      id: true, label: true, scheduledDate: true, scheduledTime: true, courtName: true,
      homeScore: true, awayScore: true, homeSet1: true, awaySet1: true, homeSet2: true, awaySet2: true, homeSet3: true, awaySet3: true,
      competition: { select: { category: { select: { name: true } } } },
      homePair: { select: { name: true } }, awayPair: { select: { name: true } }
    },
    orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }, { roundOrder: "asc" }]
  }) : [];

  return tournamentDirectorySchema.parse({ activeTournaments, selectedTournamentId: selectedTournament?.id ?? null, matches });
}
