import "server-only";
import { readBackendContract } from "@/lib/backend/http-client";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import type { RankingPeriodQuery } from "@/lib/ranking/period";
import { tournamentRankingQuerySchema, tournamentRankingWorkspaceSchema } from "@/lib/backend/contracts/tournament-ranking-workspace";
export async function getTournamentRankingWorkspace(rankingId: string, period: RankingPeriodQuery = {}) {
 try {
  const query = tournamentRankingQuerySchema.parse({ rankingId, ...Object.fromEntries(Object.entries(period).filter(([,value]) => value !== undefined)) });
  const origin = process.env.VX4_BACKEND_ORIGIN;
  return origin ? await readBackendContract(origin, `/api/management/tournaments/ranking?${new URLSearchParams(query)}`, tournamentRankingWorkspaceSchema, { cookie: await managementCookieHeader() ?? "" }) : await (await import("@/lib/backend/services/tournament-ranking-workspace")).resolveTournamentRankingWorkspace(query);
 } catch { throw Error("Não foi possível consultar o ranking."); }
}
