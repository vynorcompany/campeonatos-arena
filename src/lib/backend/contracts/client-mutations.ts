import { z } from 'zod';
const identityFields = ['name', 'points', 'class', 'gender', 'phone', 'email', 'cpf', 'addressZipCode', 'addressStreet', 'addressNumber', 'addressNeighborhood', 'addressCity', 'addressState', 'birthDate', 'leagueTier', 'isTeacher', 'personType', 'cnpj', 'allowOverdueComandas', 'guardianId'] as const;
export const clientMutationFields = {
  'loyalty-settings': ['enabled', 'visitsRequired', 'rewardLabel'], 'loyalty-visit': ['playerId', 'notes'], 'loyalty-redeem': ['playerId'], 'loyalty-fulfill': ['activityId'],
  create: identityFields, update: [...identityFields, 'playerId', 'dependentPlayerId'], archive: ['playerId'], reactivate: ['playerId'], delete: ['playerId'], points: ['playerId', 'points'], 'reset-ranking': [],
  balance: ['playerId', 'kind', 'operation', 'amount', 'reason'], merge: ['primaryPlayerId', 'duplicatePlayerId'], 'archive-many': ['playerId'], import: [],
} as const;
export const clientMutationOperations = ['create', 'update', 'archive', 'reactivate', 'delete', 'points', 'reset-ranking', 'balance', 'merge', 'archive-many', 'import', 'loyalty-settings', 'loyalty-visit', 'loyalty-redeem', 'loyalty-fulfill'] as const;
export type ClientMutationOperation = typeof clientMutationOperations[number];
export const clientMutationOutcomeSchema = z.object({ error: z.string().nullable(), success: z.string().nullable().optional(), imported: z.number().int().nonnegative().optional() }).strict();
export type ClientMutationOutcome = z.infer<typeof clientMutationOutcomeSchema>;
export const clientPhotoMaxBytes = 4 * 1024 * 1024;
export const clientCsvMaxBytes = 16 * 1024 * 1024;
export function clientMutationBodyLimit(operation: ClientMutationOperation) { return operation === 'import' ? 23 * 1024 * 1024 : ['create', 'update'].includes(operation) ? 6 * 1024 * 1024 : 64 * 1024; }
export function clientMutationInputSchema(operation: ClientMutationOperation) {
  const maxFileBytes = operation === 'import' ? clientCsvMaxBytes : clientPhotoMaxBytes;
  return z.object({
    fields: z.record(z.string(), z.array(z.string().max(4096)).min(1).max(operation === 'archive-many' ? 1000 : 1)),
    file: z.object({ name: z.string().max(255), type: z.string().max(120), base64: z.string().max(Math.ceil(maxFileBytes / 3) * 4).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/) }).strict().optional(),
  }).strict().superRefine((input, ctx) => {
    for (const key of Object.keys(input.fields)) if (!(clientMutationFields[operation] as readonly string[]).includes(key)) ctx.addIssue({ code: 'custom', message: 'Unexpected field', path: ['fields', key] });
    if (input.file && !['create', 'update', 'import'].includes(operation)) ctx.addIssue({ code: 'custom', message: 'Unexpected file', path: ['file'] });
  });
}
