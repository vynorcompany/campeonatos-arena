ALTER TABLE "Arena" ADD COLUMN "athletePortalShowDoublesRadar" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Player" ADD COLUMN "tournamentAvailability" TEXT NOT NULL DEFAULT 'OFF';
