import "server-only";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { refreshTournamentRoutes } from "./revalidation";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { backendOrigin } from "@/lib/backend/http-client";
import { tournamentEventPayload, tournamentEventOutcomeSchema, type TournamentEventOperation } from "@/lib/backend/contracts/tournament-events";
const uncertain = "Não foi possível confirmar a alteração. Confira o evento antes de tentar novamente.";
export async function runTournamentEventMutation(operation: TournamentEventOperation, form: FormData) {
 let result;
 try {
  const fields = tournamentEventPayload(operation, form), origin = process.env.VX4_BACKEND_ORIGIN;
  if (!origin) result = await (await import("@/lib/backend/services/tournament-event-mutations")).executeTournamentEventMutation(operation, fields);
  else {
   const cookie = await managementCookieHeader(), requestOrigin = (await headers()).get("origin");
   const response = await fetch(new URL(`/api/management/tournaments/events/${operation}`, backendOrigin(origin)), { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", ...(cookie ? { cookie } : {}), ...(requestOrigin ? { origin: requestOrigin } : {}) }, body: JSON.stringify(fields), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(90000) });
   if (!response.ok) throw Error(uncertain);
   result = tournamentEventOutcomeSchema.parse(await response.json());
  }
 } catch { return { error: uncertain, success: null }; }
 if (result.refresh) refreshTournamentRoutes(); for (const entry of result.paths) revalidatePath(entry.path, entry.type);
 if (result.redirect) redirect(result.redirect);
 return result.state ?? { error: null, success: null };
}
