ALTER TABLE "AthleteIdentity" ADD COLUMN "recoveryEmail" TEXT, ADD COLUMN "recoveryEmailVerifiedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "AthleteIdentity_recoveryEmail_key" ON "AthleteIdentity"("recoveryEmail");
ALTER TABLE "AthleteIdentity" ADD CONSTRAINT "AthleteIdentity_recoveryEmail_verified_check" CHECK (("recoveryEmail" IS NULL AND "recoveryEmailVerifiedAt" IS NULL) OR ("recoveryEmail" IS NOT NULL AND "recoveryEmailVerifiedAt" IS NOT NULL));
ALTER TABLE "AccountActionToken" ADD COLUMN "athleteIdentityId" TEXT;
ALTER TABLE "AccountActionToken" ADD CONSTRAINT "AccountActionToken_athleteIdentityId_fkey" FOREIGN KEY ("athleteIdentityId") REFERENCES "AthleteIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "AccountActionToken_athleteIdentityId_kind_createdAt_idx" ON "AccountActionToken"("athleteIdentityId", "kind", "createdAt");
-- Existing tenant RLS rejects NULL arenaId for arena_runtime. Only the isolated
-- identity service can issue global athlete recovery/verification tokens.
ALTER TABLE "AccountActionToken" ADD CONSTRAINT "AccountActionToken_athlete_email_scope_check" CHECK (
  ("kind" IN ('ATHLETE_EMAIL_VERIFY','ATHLETE_EMAIL_RESET') AND "athleteIdentityId" IS NOT NULL AND "arenaId" IS NULL AND "userId" IS NULL)
  OR ("kind" NOT IN ('ATHLETE_EMAIL_VERIFY','ATHLETE_EMAIL_RESET') AND "athleteIdentityId" IS NULL)
);
