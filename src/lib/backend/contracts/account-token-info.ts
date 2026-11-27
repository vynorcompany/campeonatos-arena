import { z } from "zod";
export const accountTokenInfoInputSchema = z.object({ kind: z.enum(['INVITE', 'RESET']), token: z.string().regex(/^[a-f0-9]{64}$/i) }).strict();
export const accountTokenInfoSchema = z.object({
  valid: z.boolean(), invitation: z.object({ email: z.string(), arenaName: z.string(), existingUser: z.boolean() }).strict().nullable(),
}).strict().refine(value => value.valid || value.invitation === null);
export type AccountTokenInfo = z.infer<typeof accountTokenInfoSchema>;
