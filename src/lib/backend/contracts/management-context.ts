import { z } from "zod";

const arenaRole = z.enum(['OWNER', 'ADMIN', 'STAFF', 'VIEWER']);
const membership = z.object({
  arenaId: z.string(), arenaName: z.string(), arenaLogoUrl: z.string(), arenaRole,
  viewPermissions: z.array(z.string()), editPermissions: z.array(z.string()),
}).strict();
export const managementAuthContextSchema = z.object({
  userId: z.string(), userName: z.string(), userEmail: z.string(),
  systemRole: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER']),
  arenaRole: arenaRole.nullable(), arenaId: z.string().nullable(), arenaName: z.string().nullable(),
  viewPermissions: z.array(z.string()), editPermissions: z.array(z.string()), memberships: z.array(membership),
}).strict();
export type ManagementAuthContext = z.infer<typeof managementAuthContextSchema>;
export const managementContextResponseSchema = z.object({
  auth: managementAuthContextSchema.nullable(), redirectTo: z.enum(['/login', '/acesso-indisponivel']).nullable(),
}).strict().refine(value => !value.redirectTo || value.auth === null);
