-- AlterTable
ALTER TABLE "Student" ADD COLUMN "playerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Student_playerId_key" ON "Student"("playerId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
