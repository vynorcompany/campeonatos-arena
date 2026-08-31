ALTER TABLE "Teacher" ADD COLUMN "playerId" TEXT;

CREATE UNIQUE INDEX "Teacher_playerId_key" ON "Teacher"("playerId");

ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
