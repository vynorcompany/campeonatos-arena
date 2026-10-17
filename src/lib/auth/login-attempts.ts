import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function activeLoginLock(key: string) {
  const attempt = await prisma.loginAttempt.findUnique({ where: { email: key }, select: { lockedUntil: true } });
  return attempt?.lockedUntil && attempt.lockedUntil > new Date() ? attempt.lockedUntil : null;
}

export async function recordFailedLogin(key: string) {
  const maxAttempts = env.loginMaxAttempts;
  const lockMinutes = env.loginLockMinutes;
  // One statement keeps concurrent failures on the same identity from overwriting each other.
  // The lock duration also defines the sliding failure window; sparse mistakes must not accumulate forever.
  // Prisma stores DateTime in timestamp columns as UTC; avoid session time-zone conversion here.
  const [attempt] = await prisma.$queryRaw<Array<{ lockedUntil: Date | null }>>`
    INSERT INTO "LoginAttempt" ("email", "failedCount", "lockedUntil", "createdAt", "updatedAt")
    VALUES (${key}, 1, NULL, (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))
    ON CONFLICT ("email") DO UPDATE SET
      "failedCount" = CASE
        WHEN ("LoginAttempt"."lockedUntil" IS NOT NULL AND "LoginAttempt"."lockedUntil" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))
          OR "LoginAttempt"."updatedAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - (${lockMinutes} * INTERVAL '1 minute') THEN 1
        ELSE "LoginAttempt"."failedCount" + 1
      END,
      "lockedUntil" = CASE
        WHEN "LoginAttempt"."lockedUntil" > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') THEN "LoginAttempt"."lockedUntil"
        WHEN (CASE
          WHEN ("LoginAttempt"."lockedUntil" IS NOT NULL AND "LoginAttempt"."lockedUntil" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))
            OR "LoginAttempt"."updatedAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - (${lockMinutes} * INTERVAL '1 minute') THEN 1
          ELSE "LoginAttempt"."failedCount" + 1
        END) >= ${maxAttempts} THEN (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + (${lockMinutes} * INTERVAL '1 minute')
        ELSE NULL
      END,
      "updatedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
    RETURNING "lockedUntil"
  `;
  return attempt?.lockedUntil ?? null;
}

export async function clearLoginFailures(key: string) {
  await prisma.loginAttempt.deleteMany({ where: { email: key } });
}
