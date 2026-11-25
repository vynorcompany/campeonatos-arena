import crypto from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export const athleteEmailKinds = { verify: "ATHLETE_EMAIL_VERIFY", reset: "ATHLETE_EMAIL_RESET" } as const;
export function athleteEmailTokenHash(token: string) { return crypto.createHash("sha256").update(token).digest("hex"); }

/** Caller must resolve identityId from the authenticated session or a verified email. */
export async function issueAthleteEmailToken(db: PrismaClient, identityId: string, email: string, kind: typeof athleteEmailKinds[keyof typeof athleteEmailKinds]) {
  const token = crypto.randomBytes(32).toString("hex");
  return db.$transaction(async tx => {
    const identity = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "AthleteIdentity" WHERE id = ${identityId} FOR UPDATE`;
    if (!identity.length) return null;
    const recent = await tx.accountActionToken.count({ where: { athleteIdentityId: identityId, kind, createdAt: { gt: new Date(Date.now() - 15 * 60_000) } } });
    if (recent >= 3) return null;
    await tx.accountActionToken.updateMany({ where: { athleteIdentityId: identityId, kind, usedAt: null }, data: { usedAt: new Date() } });
    const record = await tx.accountActionToken.create({ data: { kind, athleteIdentityId: identityId, email, tokenHash: athleteEmailTokenHash(token), expiresAt: new Date(Date.now() + 30 * 60_000) } });
    return { token, id: record.id };
  });
}

export async function confirmAthleteRecoveryEmail(db: PrismaClient, token: string, actorIdentityId: string) {
  return db.$transaction(async tx => {
    const record = await tx.accountActionToken.findUnique({ where: { tokenHash: athleteEmailTokenHash(token) } });
    if (!record || record.kind !== athleteEmailKinds.verify || record.athleteIdentityId !== actorIdentityId || record.usedAt || record.expiresAt <= new Date()) return false;
    await tx.$queryRaw`SELECT id FROM "AthleteIdentity" WHERE id = ${actorIdentityId} FOR UPDATE`;
    const claim = await tx.accountActionToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (!claim.count) return false;
    await tx.athleteIdentity.update({ where: { id: actorIdentityId }, data: { recoveryEmail: record.email, recoveryEmailVerifiedAt: new Date() } });
    await tx.accountActionToken.updateMany({ where: { athleteIdentityId: actorIdentityId, kind: { in: Object.values(athleteEmailKinds) }, usedAt: null }, data: { usedAt: new Date() } });
    return true;
  });
}

export async function resetAthletePasswordByEmail(db: PrismaClient, token: string, passwordHash: string) {
  return db.$transaction(async tx => {
    const record = await tx.accountActionToken.findUnique({ where: { tokenHash: athleteEmailTokenHash(token) } });
    if (!record || record.kind !== athleteEmailKinds.reset || !record.athleteIdentityId || record.usedAt || record.expiresAt <= new Date()) return false;
    const identityId = record.athleteIdentityId;
    await tx.$queryRaw`SELECT id FROM "AthleteIdentity" WHERE id = ${identityId} FOR UPDATE`;
    const identity = await tx.athleteIdentity.findUnique({ where: { id: identityId }, select: { phone: true, recoveryEmail: true, recoveryEmailVerifiedAt: true } });
    if (!identity?.recoveryEmailVerifiedAt || identity.recoveryEmail !== record.email) return false;
    const claim = await tx.accountActionToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (!claim.count) return false;
    const accounts = await tx.playerAccount.findMany({ where: { identityId }, select: { id: true, arenaId: true } });
    await tx.athleteIdentity.update({ where: { id: identityId }, data: { passwordHash } });
    await tx.playerAccount.updateMany({ where: { identityId }, data: { passwordHash } });
    await tx.playerSession.deleteMany({ where: { OR: [{ athleteIdentityId: identityId }, { playerAccountId: { in: accounts.map(a => a.id) } }] } });
    await tx.accountActionToken.updateMany({ where: { athleteIdentityId: identityId, kind: { in: Object.values(athleteEmailKinds) }, usedAt: null }, data: { usedAt: new Date() } });
    await tx.playerVerificationCode.updateMany({ where: { phone: identity.phone, purpose: "RESET", arenaId: { in: accounts.map(a => a.arenaId) }, usedAt: null }, data: { usedAt: new Date() } });
    await tx.loginAttempt.deleteMany({ where: { email: { in: [`athlete:${identity.phone}`, `athlete-email:${identityId}`] } } });
    await tx.playerAuthAttempt.deleteMany({ where: { phone: identity.phone, arenaId: { in: accounts.map(a => a.arenaId) } } });
    return true;
  });
}
