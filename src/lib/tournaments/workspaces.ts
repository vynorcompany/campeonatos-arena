import "server-only";
import { readBackendContract } from "@/lib/backend/http-client";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { tournamentWorkspaceQuerySchema, tournamentCategoriesSchema, tournamentGamesSchema, tournamentOverviewSchema } from "@/lib/backend/contracts/tournament-workspaces";
export async function getTournamentCategories(tournamentId: string) {
 try {
  const query = tournamentWorkspaceQuerySchema.parse({ view: "categories", tournamentId });
  const origin = process.env.VX4_BACKEND_ORIGIN;
  if (!origin) return await (await import("@/lib/backend/services/tournament-workspaces")).resolveTournamentCategories(tournamentId);
  return await readBackendContract(origin, `/api/management/tournaments/workspace?${new URLSearchParams(query)}`, tournamentCategoriesSchema, { cookie: await managementCookieHeader() ?? "" });
 } catch { throw Error("Não foi possível consultar as categorias do evento."); }
}
export async function getTournamentGames(tournamentId: string) {
 try {
  const query = tournamentWorkspaceQuerySchema.parse({ view: "games", tournamentId });
  const origin = process.env.VX4_BACKEND_ORIGIN;
  if (!origin) return await (await import("@/lib/backend/services/tournament-workspaces")).resolveTournamentGames(tournamentId);
  return await readBackendContract(origin, `/api/management/tournaments/workspace?${new URLSearchParams(query)}`, tournamentGamesSchema, { cookie: await managementCookieHeader() ?? "" });
 } catch { throw Error("Não foi possível consultar os jogos do evento."); }
}

export async function getTournamentOverview(tournamentId: string) {
 try {
  const query = tournamentWorkspaceQuerySchema.parse({ view: "overview", tournamentId });
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const data = origin
   ? await readBackendContract(origin, `/api/management/tournaments/workspace?${new URLSearchParams(query)}`, tournamentOverviewSchema, { cookie: await managementCookieHeader() ?? "" })
   : await (await import("@/lib/backend/services/tournament-workspaces")).resolveTournamentOverview(tournamentId);
  const tournament = data.tournament;
  return { ...data, tournament: tournament ? { ...tournament, createdAt: new Date(tournament.createdAt), updatedAt: new Date(tournament.updatedAt), firstBonusUntil: tournament.firstBonusUntil ? new Date(tournament.firstBonusUntil) : null, publicRegistrations: tournament.publicRegistrations.map(registration => ({ ...registration, createdAt: new Date(registration.createdAt) })) } : null };
 } catch { throw Error("Não foi possível consultar o evento."); }
}
