ALTER TABLE "PublicTournamentRegistration"
ADD COLUMN "holdExpiresAt" TIMESTAMP(3);

CREATE INDEX "PubReg_tournament_status_hold_idx"
ON "PublicTournamentRegistration"("tournamentId", "status", "holdExpiresAt");
