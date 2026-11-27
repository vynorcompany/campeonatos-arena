import "server-only";
import type { Prisma } from "@prisma/client";
import { requireModuleView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";
import { arenaDatabase } from "@/lib/arena-database";
import { canEditManualTournamentRegistration } from "@/lib/tournaments/registration-deletion";
import { getTournamentScheduleConflicts } from "@/lib/services/tournament-queries";
import { tournamentEventRegistrationsSchema, tournamentGeneralRegistrationsSchema } from "../contracts/tournament-registration-queries";
const registrationSelect = {
 id: true, categoryId: true, leadPlayerId: true, leadName: true, partnerName: true, thirdName: true, amountCents: true, status: true, paymentStatus: true, paymentProvider: true, paymentReference: true, mercadoPagoPaymentId: true, paymentCheckoutUrl: true,
 leadPhone: true, leadCpf: true, leadBirthDate: true, partnerPhone: true, partnerCpf: true, partnerBirthDate: true, thirdPhone: true, thirdCpf: true, thirdBirthDate: true,
} satisfies Prisma.PublicTournamentRegistrationSelect;
const categoryOption = { id: true, name: true, registrationType: true, competition: { select: { format: true } } } satisfies Prisma.TournamentCategorySelect;
const bracketSelect = { categoryId: true, matches: { orderBy: { roundOrder: "asc" }, select: { id: true, label: true, scheduledTime: true, courtName: true, homeRegistrationId: true, awayRegistrationId: true } } } satisfies Prisma.CategoryBracketSelect;
function serializeRegistration(registration: Prisma.PublicTournamentRegistrationGetPayload<{ select: typeof registrationSelect }>, category: { registrationType: string; competition: { format: string } | null }) {
 const canEdit = canEditManualTournamentRegistration(registration);
 const partnerEditable = canEdit && category.registrationType !== "INDIVIDUAL", thirdEditable = partnerEditable && category.competition?.format === "TRIO";
 return { id: registration.id, categoryId: registration.categoryId, leadPlayerId: registration.leadPlayerId, leadName: registration.leadName, partnerName: registration.partnerName, thirdName: registration.thirdName,
  amountCents: registration.amountCents, status: registration.status, paymentStatus: registration.paymentStatus, paymentProvider: registration.paymentProvider, canEdit,
  mercadoPagoPaymentId: registration.paymentStatus === "REVIEW" ? registration.mercadoPagoPaymentId : "",
  leadPhone: canEdit ? registration.leadPhone : "", leadCpf: canEdit ? registration.leadCpf : "", leadBirthDate: canEdit ? registration.leadBirthDate?.toISOString() ?? null : null,
  partnerPhone: partnerEditable ? registration.partnerPhone : "", partnerCpf: partnerEditable ? registration.partnerCpf : "", partnerBirthDate: partnerEditable ? registration.partnerBirthDate?.toISOString() ?? null : null,
  thirdPhone: thirdEditable ? registration.thirdPhone : "", thirdCpf: thirdEditable ? registration.thirdCpf : "", thirdBirthDate: thirdEditable ? registration.thirdBirthDate?.toISOString() ?? null : null,
 };
}
async function context() {
 const auth = await requireModuleView("tournaments");
 if (!canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) throw Error("Sem permissão para gerenciar inscrições.");
 return auth;
}
export async function resolveTournamentEventRegistrations(tournamentId: string) {
 const auth = await context(), db = arenaDatabase(auth.arenaId);
 const tournament = await db.tournament.findFirst({ where: { id: tournamentId, arenaId: auth.arenaId }, select: { id: true,
  categories: { orderBy: { level: "asc" }, select: categoryOption },
  publicRegistrations: { where: { category: { tournamentId, tournament: { arenaId: auth.arenaId } } }, orderBy: { createdAt: "asc" }, select: { ...registrationSelect, category: { select: categoryOption } } },
 } });
 if (!tournament) return tournamentEventRegistrationsSchema.parse({ tournament: null, bankAccounts: [] });
 const bankAccounts = await db.bankAccount.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
 return tournamentEventRegistrationsSchema.parse({ tournament: { id: tournament.id, categories: tournament.categories, publicRegistrations: tournament.publicRegistrations.map(registration => ({ ...serializeRegistration(registration, registration.category), category: registration.category })) }, bankAccounts });
}
function generalSelect(arenaId: string, tournamentId: string) {
 return { id: true, registrationPhase: true, categories: { where: { active: true }, orderBy: { level: "asc" }, select: { id: true, name: true, registrationType: true, groupCount: true, pairsPerGroup: true,
  competition: { select: { format: true, pairs: { where: { active: true }, orderBy: { drawOrder: "asc" }, select: { id: true, name: true, players: { where: { player: { arenaId } }, orderBy: { slot: "asc" }, select: { player: { select: { id: true, name: true } } } } } } } },
  registrations: { where: { tournamentId, tournament: { arenaId } }, orderBy: { createdAt: "asc" }, select: registrationSelect },
 } } } as const;
}
export async function resolveTournamentGeneralRegistrations(requestedId?: string) {
 const auth = await context(), db = arenaDatabase(auth.arenaId);
 const events = await db.tournament.findMany({ where: { arenaId: auth.arenaId, status: { not: "FINISHED" } }, orderBy: { createdAt: "desc" }, select: { id: true, name: true } });
 const selectedId = events.find(event => event.id === requestedId)?.id ?? events[0]?.id;
 const empty = { events, tournament: null, bankAccounts: [], categoryBrackets: [], conflicts: [] };
 if (!selectedId) return tournamentGeneralRegistrationsSchema.parse(empty);
 const where = { id: selectedId, arenaId: auth.arenaId, status: { not: "FINISHED" } };
 let tournament: Prisma.TournamentGetPayload<{ select: ReturnType<typeof generalSelect> }> | null;
 let brackets: Prisma.CategoryBracketGetPayload<{ select: typeof bracketSelect }>[] = [];
 try {
  const result = await db.tournament.findFirst({ where, select: { ...generalSelect(auth.arenaId, selectedId), categoryBrackets: { where: { category: { tournamentId: selectedId, tournament: { arenaId: auth.arenaId } } }, select: bracketSelect } } });
  tournament = result; brackets = result?.categoryBrackets ?? [];
 } catch {
  // Preserve the existing legacy bracket compatibility path inside the backend.
  tournament = await db.tournament.findFirst({ where, select: generalSelect(auth.arenaId, selectedId) });
 }
 if (!tournament) return tournamentGeneralRegistrationsSchema.parse(empty);
 const bankAccounts = await db.bankAccount.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
 const references = [...new Set(brackets.flatMap(bracket => bracket.matches.flatMap(match => [match.homeRegistrationId, match.awayRegistrationId].filter((id): id is string => Boolean(id)))))];
 const names = references.length ? await db.publicTournamentRegistration.findMany({ where: { id: { in: references }, tournamentId: tournament.id, tournament: { arenaId: auth.arenaId }, category: { tournamentId: tournament.id, tournament: { arenaId: auth.arenaId } } }, select: { id: true, leadName: true, partnerName: true } }) : [];
 const namesById = new Map(names.map(({ id, leadName, partnerName }) => [id, { leadName, partnerName }]));
 const conflicts = await getTournamentScheduleConflicts(tournament.id, auth.arenaId);
 return tournamentGeneralRegistrationsSchema.parse({ events, tournament: { id: tournament.id, registrationPhase: tournament.registrationPhase, categories: tournament.categories.map(category => ({ ...category, registrations: category.registrations.map(registration => serializeRegistration(registration, category)) })) }, bankAccounts,
  categoryBrackets: brackets.map(bracket => ({ categoryId: bracket.categoryId, matches: bracket.matches.map(match => ({ id: match.id, label: match.label, scheduledTime: match.scheduledTime, courtName: match.courtName, homeRegistration: namesById.get(match.homeRegistrationId ?? "") ?? null, awayRegistration: namesById.get(match.awayRegistrationId ?? "") ?? null })) })),
  conflicts: conflicts.map((conflict, index) => ({ key: String(index), scheduledTime: conflict.scheduledTime, labels: conflict.labels })),
 });
}
