ALTER TABLE "Player" ADD COLUMN "mergedIntoPlayerId" TEXT;
CREATE INDEX "Player_mergedIntoPlayerId_idx" ON "Player"("mergedIntoPlayerId");
ALTER TABLE "Player" ADD CONSTRAINT "Player_mergedIntoPlayerId_fkey" FOREIGN KEY ("mergedIntoPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
