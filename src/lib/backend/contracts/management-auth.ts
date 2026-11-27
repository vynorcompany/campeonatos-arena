import { z } from "zod";
export type LoginState = { error: string | null };
export type RegisterArenaState = { error: string | null };
export const managementAuthOperations = ['login', 'register-arena', 'logout', 'select-arena', 'select-workspace', 'invite', 'revoke-invite', 'request-reset', 'send-user-recovery', 'complete-reset', 'accept-invite'] as const;
export type ManagementAuthOperation = typeof managementAuthOperations[number];
export const managementAuthFields = ['email', 'password', 'confirmPassword', 'arenaName', 'ownerName', 'contactWebsite', 'arenaId', 'workspaceId'] as const;
export const managementAuthInputSchema = z.record(z.string().refine(key => (managementAuthFields as readonly string[]).includes(key)), z.string().max(4096));
export const managementAuthOutcomeSchema = z.object({
  error: z.string().nullable(), success: z.string().nullable().optional(), invitationUrl: z.string().refine(value => {
    try {
      if (value.startsWith('//')) return false;
      const url = new URL(value, 'https://account.invalid');
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.hash && ['/convite', '/redefinir-senha'].includes(url.pathname) && /^[a-f0-9]{64}$/i.test(url.searchParams.get('token') || '') && Array.from(url.searchParams.keys()).every(key => key === 'token');
    } catch { return false; }
  }).optional(), redirectTo: z.enum(['/login', '/painel', '/agencia', '/acesso-indisponivel']).optional(),
}).strict();
export type ManagementAuthOutcome = z.infer<typeof managementAuthOutcomeSchema>;

const accountAccessFields = {
  invite: ['email', 'name', 'permissionProfileId'], 'revoke-invite': ['inviteId'],
  'request-reset': ['email'], 'send-user-recovery': ['userId'],
  'complete-reset': ['token', 'password', 'confirmPassword'], 'accept-invite': ['token', 'password', 'confirmPassword'],
} as const;
export function managementFieldsFor(operation: ManagementAuthOperation): readonly string[] {
  return operation in accountAccessFields ? accountAccessFields[operation as keyof typeof accountAccessFields] : managementAuthFields;
}
export function managementInputSchemaFor(operation: ManagementAuthOperation) {
  return z.record(z.string().refine(key => managementFieldsFor(operation).includes(key)), z.string().max(4096));
}
