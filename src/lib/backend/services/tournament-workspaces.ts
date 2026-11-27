import "server-only";
import { requireModuleView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";
import { arenaDatabase } from "@/lib/arena-database";
import { tournamentCategoriesSchema, tournamentGamesSchema } from "../contracts/tournament-workspaces";
async function context() {
 const auth = await requireModuleView("tournaments");
 if (!canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) throw Error("Sem permissão para gerenciar eventos.");
 return auth;
}
export async function resolveTournamentCategories(tournamentId: string) {
 const auth = await context();
 const tournament = await arenaDatabase(auth.arenaId).tournament.findFirst({
  where: { id: tournamentId, arenaId: auth.arenaId },
  select: { id: true, name: true, categories: { where: { archivedAt: null }, orderBy: { level: "asc" }, select: { id: true, name: true, registrationType: true, _count: { select: { registrations: true } }, competition: { select: { format: true, _count: { select: { pairs: { where: { active: true } } } } } } } } },
 });
 return tournamentCategoriesSchema.parse({ view: "categories", tournament: tournament ? { id: tournament.id, name: tournament.name } : null,
  categories: tournament?.categories.map(category => ({ id: category.id, name: category.name, registrationType: category.registrationType, registrationCount: category._count.registrations, competition: category.competition ? { format: category.competition.format, pairCount: category.competition._count.pairs } : null })) ?? [],
 });
}
export async function resolveTournamentGames(tournamentId: string) {
 const auth = await context();
 const prisma = arenaDatabase(auth.arenaId);
 const [tournament, courts, matches] = await Promise.all([
  prisma.tournament.findFirst({ where: { id: tournamentId, arenaId: auth.arenaId }, select: { id: true, name: true } }),
  prisma.court.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { name: true }, orderBy: { name: "asc" } }),
  prisma.categoryMatch.findMany({ where: { competition: { category: { tournamentId, tournament: { arenaId: auth.arenaId } } } }, select: { id: true, label: true, scheduledDate: true, scheduledTime: true, courtName: true, competition: { select: { category: { select: { name: true } } } }, homePair: { select: { name: true } }, awayPair: { select: { name: true } } }, orderBy: { roundOrder: "asc" } }),
 ]);
 return tournamentGamesSchema.parse({ view: "games", tournament, courts: tournament ? courts : [], matches: tournament ? matches : [] });
}
