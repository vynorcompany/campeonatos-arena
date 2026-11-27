import { z } from "zod";
export type LoginState = { error: string | null };
export type RegisterArenaState = { error: string | null };
export const managementAuthOperations = ['login', 'register-arena', 'logout', 'select-arena', 'select-workspace'] as const;
export type ManagementAuthOperation = typeof managementAuthOperations[number];
export const managementAuthFields = ['email', 'password', 'confirmPassword', 'arenaName', 'ownerName', 'contactWebsite', 'arenaId', 'workspaceId'] as const;
export const managementAuthInputSchema = z.record(z.string().refine(key => (managementAuthFields as readonly string[]).includes(key)), z.string().max(4096));
export const managementAuthOutcomeSchema = z.object({
  error: z.string().nullable(), redirectTo: z.enum(['/login', '/painel', '/agencia']).optional(),
}).strict();
export type ManagementAuthOutcome = z.infer<typeof managementAuthOutcomeSchema>;
