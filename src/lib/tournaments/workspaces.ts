import "server-only";
import { readBackendContract } from "@/lib/backend/http-client";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { tournamentWorkspaceQuerySchema, tournamentCategoriesSchema, tournamentGamesSchema } from "@/lib/backend/contracts/tournament-workspaces";
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
