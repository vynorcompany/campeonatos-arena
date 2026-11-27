import "server-only";
import { requireModuleView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";
import { arenaDatabase } from "@/lib/arena-database";
import { tournamentCreateOptionsSchema, tournamentCategoryCreateContextSchema } from "../contracts/tournament-events";
async function context() {
 const auth = await requireModuleView("tournaments");
 if (!canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) throw Error("Sem permissão para gerenciar eventos.");
 return auth;
}
export async function resolveTournamentCreateOptions() {
 const auth = await context();
 return tournamentCreateOptionsSchema.parse({ rankings: await arenaDatabase(auth.arenaId).rankingProfile.findMany({ where: { arenaId: auth.arenaId, type: "INDIVIDUAL", model: "KNOCKOUT" }, orderBy: { name: "asc" }, select: { id: true, name: true } }) });
}
export async function resolveTournamentCategoryCreateContext(tournamentId: string) {
 const auth = await context();
 return tournamentCategoryCreateContextSchema.parse({ tournament: await arenaDatabase(auth.arenaId).tournament.findFirst({ where: { id: tournamentId, arenaId: auth.arenaId }, select: { id: true, name: true } }) });
}
