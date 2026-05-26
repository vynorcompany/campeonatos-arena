ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "publicSlug" TEXT;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "registrationPhase" TEXT NOT NULL DEFAULT 'REGISTRATIONS';
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "priceFirstCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "priceSecondCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "priceThirdCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "blockCategoryGap" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "maxCategoryGap" INTEGER NOT NULL DEFAULT 1;

UPDATE "Tournament"
SET "publicSlug" = lower(regexp_replace(coalesce("name", ''), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring("id" from 1 for 6)
WHERE "publicSlug" IS NULL OR btrim("publicSlug") = '';

ALTER TABLE "Tournament" ALTER COLUMN "publicSlug" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Tournament_publicSlug_key'
  ) THEN
    ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_publicSlug_key" UNIQUE ("publicSlug");
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "TournamentCategory" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "level" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tournamentId" TEXT NOT NULL,
  CONSTRAINT "TournamentCategory_tournamentId_fkey"
    FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PublicTournamentRegistration" (
  "id" TEXT PRIMARY KEY,
  "leadName" TEXT NOT NULL,
  "leadPhone" TEXT NOT NULL,
  "leadCpf" TEXT NOT NULL,
  "leadBirthDate" TIMESTAMP(3) NOT NULL,
  "partnerName" TEXT NOT NULL,
  "partnerPhone" TEXT NOT NULL,
  "partnerCpf" TEXT NOT NULL,
  "partnerBirthDate" TIMESTAMP(3) NOT NULL,
  "registrationOrder" INTEGER NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "paymentProvider" TEXT NOT NULL DEFAULT '',
  "paymentReference" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  CONSTRAINT "PublicTournamentRegistration_tournamentId_fkey"
    FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PublicTournamentRegistration_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "TournamentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TournamentCategory_tournamentId_name_key" ON "TournamentCategory"("tournamentId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "TournamentCategory_tournamentId_level_key" ON "TournamentCategory"("tournamentId", "level");
CREATE INDEX IF NOT EXISTS "TournamentCategory_tournamentId_level_idx" ON "TournamentCategory"("tournamentId", "level");
CREATE INDEX IF NOT EXISTS "PublicTournamentRegistration_tournamentId_createdAt_idx" ON "PublicTournamentRegistration"("tournamentId", "createdAt");
CREATE INDEX IF NOT EXISTS "PublicTournamentRegistration_categoryId_createdAt_idx" ON "PublicTournamentRegistration"("categoryId", "createdAt");
CREATE INDEX IF NOT EXISTS "PublicTournamentRegistration_leadCpf_createdAt_idx" ON "PublicTournamentRegistration"("leadCpf", "createdAt");
CREATE INDEX IF NOT EXISTS "PublicTournamentRegistration_partnerCpf_createdAt_idx" ON "PublicTournamentRegistration"("partnerCpf", "createdAt");
