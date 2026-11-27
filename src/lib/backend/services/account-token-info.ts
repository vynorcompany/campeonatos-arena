import "server-only";
import { prisma } from "@/lib/auth/database";
import { hashAccountToken } from "@/lib/auth/account-tokens";
import { accountTokenInfoInputSchema, type AccountTokenInfo } from "@/lib/backend/contracts/account-token-info";

export async function resolveAccountTokenInfo(kind: 'INVITE' | 'RESET', token: string): Promise<AccountTokenInfo> {
  if (!accountTokenInfoInputSchema.safeParse({ kind, token }).success) return { valid: false, invitation: null };
  const record = await prisma.accountActionToken.findUnique({
    where: { tokenHash: hashAccountToken(token) }, select: { kind: true, email: true, arenaId: true, usedAt: true, expiresAt: true },
  });
  if (!record || record.kind !== kind || record.usedAt || record.expiresAt <= new Date()) return { valid: false, invitation: null };
  if (kind === 'RESET') return { valid: true, invitation: null };
  if (!record.arenaId) return { valid: false, invitation: null };
  const [arena, user] = await Promise.all([
    prisma.arena.findUnique({ where: { id: record.arenaId }, select: { name: true } }),
    prisma.user.findUnique({ where: { email: record.email }, select: { id: true } }),
  ]);
  return arena ? { valid: true, invitation: { email: record.email, arenaName: arena.name, existingUser: Boolean(user) } } : { valid: false, invitation: null };
}
