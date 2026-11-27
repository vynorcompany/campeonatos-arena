import { z } from "zod";
const id = z.string().min(1).max(100);
export const tournamentRegistrationQuerySchema = z.discriminatedUnion("view", [
 z.object({ view: z.literal("directory"), tournamentId: id.optional() }).strict(),
 z.object({ view: z.literal("event"), tournamentId: id }).strict(),
]);
const option = z.object({ id: z.string(), name: z.string() }).strict();
export const tournamentRegistrationSchema = z.object({
 id: z.string(), categoryId: z.string(), leadPlayerId: z.string().nullable(), leadName: z.string(), partnerName: z.string(), thirdName: z.string(),
 amountCents: z.number().int(), status: z.string(), paymentStatus: z.string(), paymentProvider: z.string(), canEdit: z.boolean(), mercadoPagoPaymentId: z.string(),
 leadPhone: z.string(), leadCpf: z.string(), leadBirthDate: z.iso.datetime().nullable(), partnerPhone: z.string(), partnerCpf: z.string(), partnerBirthDate: z.iso.datetime().nullable(), thirdPhone: z.string(), thirdCpf: z.string(), thirdBirthDate: z.iso.datetime().nullable(),
}).strict().superRefine((registration, ctx) => {
 if (registration.canEdit && (registration.status !== "PENDING_PAYMENT" || registration.paymentStatus !== "PENDING" || registration.paymentProvider !== "MANUAL")) ctx.addIssue({ code: "custom", message: "Permissão de edição inconsistente." });
 if (!registration.canEdit && [registration.leadPhone, registration.leadCpf, registration.leadBirthDate, registration.partnerPhone, registration.partnerCpf, registration.partnerBirthDate, registration.thirdPhone, registration.thirdCpf, registration.thirdBirthDate].some(Boolean)) ctx.addIssue({ code: "custom", message: "Dados de edição indisponíveis." });
 if (registration.paymentStatus !== "REVIEW" && registration.mercadoPagoPaymentId) ctx.addIssue({ code: "custom", message: "Identificador de revisão indisponível." });
});
export type TournamentRegistrationWire = z.infer<typeof tournamentRegistrationSchema>;
const categoryOption = z.object({ id: z.string(), name: z.string(), registrationType: z.string(), competition: z.object({ format: z.string() }).strict().nullable() }).strict();
export const tournamentEventRegistrationsSchema = z.object({
 tournament: z.object({ id: z.string(), categories: z.array(categoryOption), publicRegistrations: z.array(tournamentRegistrationSchema.safeExtend({ category: categoryOption }).strict()) }).strict().nullable(),
 bankAccounts: z.array(option),
}).strict();
const pair = z.object({ id: z.string(), name: z.string(), players: z.array(z.object({ player: option }).strict()) }).strict();
const bracketName = z.object({ leadName: z.string(), partnerName: z.string() }).strict().nullable();
export const tournamentGeneralRegistrationsSchema = z.object({
 events: z.array(option),
 tournament: z.object({ id: z.string(), registrationPhase: z.string(), categories: z.array(z.object({ id: z.string(), name: z.string(), registrationType: z.string(), groupCount: z.number().int(), pairsPerGroup: z.number().int(), competition: z.object({ format: z.string(), pairs: z.array(pair) }).strict().nullable(), registrations: z.array(tournamentRegistrationSchema) }).strict()) }).strict().nullable(),
 bankAccounts: z.array(option), categoryBrackets: z.array(z.object({ categoryId: z.string(), matches: z.array(z.object({ id: z.string(), label: z.string(), scheduledTime: z.string(), courtName: z.string(), homeRegistration: bracketName, awayRegistration: bracketName }).strict()) }).strict()),
 conflicts: z.array(z.object({ key: z.string(), scheduledTime: z.string(), labels: z.array(z.string()) }).strict()),
}).strict();
