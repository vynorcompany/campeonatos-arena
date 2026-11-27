import { z } from "zod";
const eventFields = ["creationMode", "name", "description", "responsibleName", "responsiblePhone", "startsAt", "endsAt", "registrationOpensAt", "registrationClosesAt", "earlyDiscountReais", "earlyDiscountUntil", "firstBonusLimit", "firstBonusUntil", "publicSlug", "registrationPhase", "showInEventRadar", "onlinePaymentEnabledPresent", "onlinePaymentEnabled", "groupCount", "pairsPerGroup", "priceFirstCents", "priceSecondCents", "priceThirdCents", "blockCategoryGap", "maxCategoryGap", "categoryList", "rankingId"] as const;
export const tournamentEventFields = {
 create: eventFields, update: [...eventFields, "tournamentId", "rules"],
 "create-category": ["tournamentId", "name", "registrationType", "class", "gender", "isPublic"],
 "remove-category": ["tournamentId", "categoryId", "expectedRegistrationCount", "confirmed"],
 finish: ["tournamentId"], reopen: ["tournamentId"], delete: ["tournamentId"], status: ["tournamentId", "status"],
} as const;
export type TournamentEventOperation = keyof typeof tournamentEventFields;
export function tournamentEventInputSchema(operation: TournamentEventOperation) {
 return z.record(z.string(), z.string().max(65536)).superRefine((data, ctx) => {
  for (const name of Object.keys(data)) if (!(tournamentEventFields[operation] as readonly string[]).includes(name)) ctx.addIssue({ code: "custom", message: "Campo inesperado.", path: [name] });
 });
}
export function tournamentEventPayload(operation: TournamentEventOperation, form: FormData) {
 const fields: Record<string, string> = {};
 for (const key of tournamentEventFields[operation]) { const values = form.getAll(key); if (values.length > 1 || values.some(value => typeof value !== "string")) throw Error("Campo inválido."); if (values.length) fields[key] = values[0] as string; }
 return tournamentEventInputSchema(operation).parse(fields);
}
const id = z.string().min(1).max(200);
export const tournamentEventStateSchema = z.object({ error: z.string().nullable(), success: z.string().nullable(), tournamentId: id.optional() }).strict();
const cachePath = z.string().refine(value => /^\/torneios\/[A-Za-z0-9_-]+(?:\/categorias(?:\/[A-Za-z0-9_-]+)?)?$/.test(value) || value === "/inscricao/[slug]");
export const tournamentEventOutcomeSchema = z.object({
 state: tournamentEventStateSchema.nullable(), refresh: z.boolean(), paths: z.array(z.object({ path: cachePath, type: z.enum(["page", "layout"]).optional() }).strict()).max(8),
 redirect: z.string().regex(/^\/torneios\/[A-Za-z0-9_-]+\/categorias\/[A-Za-z0-9_-]+$/).nullable(),
}).strict();
export const tournamentCreateOptionsSchema = z.object({ rankings: z.array(z.object({ id, name: z.string() }).strict()) }).strict();
export const tournamentCategoryCreateContextSchema = z.object({ tournament: z.object({ id, name: z.string() }).strict().nullable() }).strict();
