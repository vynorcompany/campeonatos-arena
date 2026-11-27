import { z } from 'zod';
export const arenaSettingsAreas = z.enum(['printer','policies','privacy']);
export const printerSettingsDataSchema = z.object({ settings: z.object({ printerPaper: z.string(), printerCopies: z.number().int() }).strict().nullable() }).strict();
export const policySettingsDataSchema = z.object({ arena: z.object({ slug: z.string() }).strict(), settings: z.object({ cancellationPolicy: z.string(), cancellationPolicyPublished: z.boolean() }).strict().nullable() }).strict();
export const privacySettingsDataSchema = z.object({ requests: z.array(z.object({ id: z.string(), kind: z.string(), status: z.string(), message: z.string(), response: z.string(), createdAt: z.iso.datetime(), player: z.object({ name: z.string() }).strict() }).strict()).max(100), references: z.array(z.object({ id: z.string(), player: z.object({ privacyRequests: z.array(z.object({ id: z.string() }).strict()).max(1) }).strict() }).strict()).max(100) }).strict();
export const arenaSettingsMutationFields = { printer: ['printerPaper','printerCopies'], policies: ['cancellationPolicy','cancellationPolicyPublished'], 'privacy-respond': ['requestId','response'], 'privacy-release': ['referenceId','reason','confirmRelease'] } as const;
export type ArenaSettingsMutation = keyof typeof arenaSettingsMutationFields;
export function arenaSettingsInputSchema(operation: ArenaSettingsMutation) {
 return z.object({ fields: z.record(z.string().max(40),z.string().max(12000)) }).strict().superRefine((value,ctx) => { for (const key of Object.keys(value.fields)) if (!(arenaSettingsMutationFields[operation] as readonly string[]).includes(key)) ctx.addIssue({ code: 'custom', message: 'Campo inválido', path: ['fields',key] }); });
}
export const arenaSettingsOutcomeSchema = z.object({ error: z.string().nullable() }).strict();
export const deviceSessionsDataSchema = z.object({ currentId: z.string().nullable(), sessions: z.array(z.object({ id: z.string(), deviceLabel: z.string(), createdAt: z.iso.datetime(), lastSeenAt: z.iso.datetime(), expiresAt: z.iso.datetime() }).strict()).max(100) }).strict();
export const revokeDeviceInputSchema = z.object({ sessionId: z.string().min(1).max(100) }).strict();
