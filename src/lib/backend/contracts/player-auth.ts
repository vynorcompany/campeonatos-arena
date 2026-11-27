import { z } from "zod";

export type PublicClientAuthState = { error: string | null; notice?: string; requested?: boolean; phone?: string };
export const publicAuthOutcomeSchema = z.object({
  error: z.string().nullable(), notice: z.string().optional(), requested: z.boolean().optional(), phone: z.string().optional(),
  redirectTo: z.string().refine(path => path.startsWith('/') && !path.startsWith('//') && !/[\\\r\n]/.test(path)).optional(),
}).strict();
export type PublicAuthOutcome = z.infer<typeof publicAuthOutcomeSchema>;
export const publicAuthOperations = ['register', 'confirm-registration', 'login', 'login-global', 'request-reset', 'confirm-reset', 'request-global-reset', 'confirm-global-reset', 'logout', 'logout-portal'] as const;
export type PublicAuthOperation = typeof publicAuthOperations[number];
export const publicAuthFields = ['arenaSlug', 'returnTo', 'phone', 'password', 'email', 'name', 'confirmPassword', 'code', 'newPassword', 'contactWebsite', 'termsAccepted', 'legalVersion'] as const;
export const publicAuthInputSchema = z.record(z.string().refine(key => (publicAuthFields as readonly string[]).includes(key)), z.string().max(4096)).refine(value => Object.values(value).reduce((size, field) => size + field.length, 0) <= 16384);
