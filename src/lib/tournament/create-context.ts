import "server-only";
import { readBackendContract } from "@/lib/backend/http-client";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { tournamentCreateOptionsSchema, tournamentCategoryCreateContextSchema } from "@/lib/backend/contracts/tournament-events";
export async function getTournamentCreateOptions() {
 try {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  if (!origin) return await (await import("@/lib/backend/services/tournament-create-context")).resolveTournamentCreateOptions();
  return await readBackendContract(origin, "/api/management/tournaments/create-context?view=event", tournamentCreateOptionsSchema, { cookie: await managementCookieHeader() ?? "" });
 } catch { throw Error("Não foi possível consultar o formulário do evento."); }
}
export async function getTournamentCategoryCreateContext(tournamentId: string) {
 try {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  if (!origin) return await (await import("@/lib/backend/services/tournament-create-context")).resolveTournamentCategoryCreateContext(tournamentId);
  const query = new URLSearchParams({ view: "category", tournamentId });
  return await readBackendContract(origin, `/api/management/tournaments/create-context?${query}`, tournamentCategoryCreateContextSchema, { cookie: await managementCookieHeader() ?? "" });
 } catch { throw Error("Não foi possível consultar o formulário da categoria."); }
}
