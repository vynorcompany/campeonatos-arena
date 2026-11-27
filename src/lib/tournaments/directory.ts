import "server-only";
import { readBackendContract } from "@/lib/backend/http-client";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { tournamentDirectoryQuerySchema, tournamentDirectorySchema, type TournamentDirectoryQuery } from "@/lib/backend/contracts/tournament-directory";
export async function getTournamentDirectory(input: TournamentDirectoryQuery) {
 try {
 const query = tournamentDirectoryQuerySchema.parse(input);
 const origin = process.env.VX4_BACKEND_ORIGIN;
 if (!origin) return await (await import("@/lib/backend/services/tournament-directory")).resolveTournamentDirectory(query);
 const search = new URLSearchParams(query);
 return await readBackendContract(origin, `/api/management/tournaments/directory?${search}`, tournamentDirectorySchema, { cookie: await managementCookieHeader() ?? "" });
 } catch { throw Error("Não foi possível consultar os eventos."); }
}
