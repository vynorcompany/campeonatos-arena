-- Preserve the registration snapshot when an authorized client removal happens.
-- SET NULL also permits the existing arena cascade, unlike an immediate RESTRICT.
ALTER TABLE "PublicTournamentRegistration" DROP CONSTRAINT "PublicTournamentRegistration_leadPlayerId_fkey";
ALTER TABLE "PublicTournamentRegistration" ADD CONSTRAINT "PublicTournamentRegistration_leadPlayerId_fkey" FOREIGN KEY ("leadPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
