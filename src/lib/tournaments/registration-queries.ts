import "server-only";
import { readBackendContract } from "@/lib/backend/http-client";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { tournamentRegistrationQuerySchema, tournamentEventRegistrationsSchema, tournamentGeneralRegistrationsSchema, type TournamentRegistrationWire } from "@/lib/backend/contracts/tournament-registration-queries";
function restoreDates(registration: TournamentRegistrationWire) {
 return { ...registration, leadBirthDate: registration.leadBirthDate ? new Date(registration.leadBirthDate) : null, partnerBirthDate: registration.partnerBirthDate ? new Date(registration.partnerBirthDate) : null, thirdBirthDate: registration.thirdBirthDate ? new Date(registration.thirdBirthDate) : null };
}
export async function getTournamentEventRegistrations(tournamentId: string) {
 try {
  const query = tournamentRegistrationQuerySchema.parse({ view: "event", tournamentId });
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const data = origin ? await readBackendContract(origin, `/api/management/tournaments/registrations?${new URLSearchParams(query)}`, tournamentEventRegistrationsSchema, { cookie: await managementCookieHeader() ?? "" }) : await (await import("@/lib/backend/services/tournament-registration-queries")).resolveTournamentEventRegistrations(tournamentId);
  return { ...data, tournament: data.tournament ? { ...data.tournament, publicRegistrations: data.tournament.publicRegistrations.map(registration => ({ ...restoreDates(registration), category: registration.category })) } : null };
 } catch { throw Error("Não foi possível consultar as inscrições do evento."); }
}
export async function getTournamentGeneralRegistrations(tournamentId?: string) {
 try {
  const query = tournamentRegistrationQuerySchema.parse({ view: "directory", ...(tournamentId ? { tournamentId } : {}) });
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const data = origin ? await readBackendContract(origin, `/api/management/tournaments/registrations?${new URLSearchParams(query)}`, tournamentGeneralRegistrationsSchema, { cookie: await managementCookieHeader() ?? "" }) : await (await import("@/lib/backend/services/tournament-registration-queries")).resolveTournamentGeneralRegistrations(tournamentId);
  return { ...data, tournament: data.tournament ? { ...data.tournament, categories: data.tournament.categories.map(category => ({ ...category, registrations: category.registrations.map(restoreDates) })) } : null };
 } catch { throw Error("Não foi possível consultar as inscrições."); }
}
