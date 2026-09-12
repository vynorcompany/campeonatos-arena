CREATE TABLE "AthleteIdentity" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AthleteIdentity_phone_key" ON "AthleteIdentity"("phone");

-- Existing credentials become one global identity per normalized telephone.
-- PlayerAccount remains arena-scoped, so financial and operational records do
-- not cross tenant boundaries.
INSERT INTO "AthleteIdentity" ("id", "phone", "passwordHash", "createdAt", "updatedAt")
SELECT DISTINCT ON (regexp_replace("phone", '\\D', '', 'g'))
    'athlete_' || md5(regexp_replace("phone", '\\D', '', 'g')),
    regexp_replace("phone", '\\D', '', 'g'),
    "passwordHash",
    "createdAt",
    "updatedAt"
FROM "PlayerAccount"
WHERE regexp_replace("phone", '\\D', '', 'g') <> ''
ORDER BY regexp_replace("phone", '\\D', '', 'g'), "createdAt" ASC;

ALTER TABLE "PlayerAccount" ADD COLUMN "identityId" TEXT;
ALTER TABLE "PlayerSession" ADD COLUMN "athleteIdentityId" TEXT;

UPDATE "PlayerAccount" AS account
SET "identityId" = identity."id"
FROM "AthleteIdentity" AS identity
WHERE identity."phone" = regexp_replace(account."phone", '\\D', '', 'g');

UPDATE "PlayerSession" AS session
SET "athleteIdentityId" = account."identityId"
FROM "PlayerAccount" AS account
WHERE account."id" = session."playerAccountId";

CREATE INDEX "PlayerAccount_identityId_idx" ON "PlayerAccount"("identityId");
CREATE INDEX "PlayerSession_athleteIdentityId_idx" ON "PlayerSession"("athleteIdentityId");

ALTER TABLE "PlayerAccount" ADD CONSTRAINT "PlayerAccount_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "AthleteIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlayerSession" ADD CONSTRAINT "PlayerSession_athleteIdentityId_fkey"
  FOREIGN KEY ("athleteIdentityId") REFERENCES "AthleteIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
