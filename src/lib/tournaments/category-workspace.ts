import "server-only";
import { readBackendContract } from "@/lib/backend/http-client";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { tournamentCategoryQuerySchema, tournamentCategoryWorkspaceSchema } from "@/lib/backend/contracts/tournament-category-workspace";
export async function getTournamentCategoryWorkspace(tournamentId: string, categoryId: string) {
 try {
  const query = tournamentCategoryQuerySchema.parse({ tournamentId, categoryId }), origin = process.env.VX4_BACKEND_ORIGIN;
  const data = origin ? await readBackendContract(origin, `/api/management/tournaments/category?${new URLSearchParams(query)}`, tournamentCategoryWorkspaceSchema, { cookie: await managementCookieHeader() ?? "" }) : await (await import("@/lib/backend/services/tournament-category-workspace")).resolveTournamentCategoryWorkspace(query);
  return { ...data, medicalRequests: data.medicalRequests.map(request => ({ ...request, requestedAt: new Date(request.requestedAt) })) };
 } catch { throw Error("Não foi possível consultar a categoria."); }
}
