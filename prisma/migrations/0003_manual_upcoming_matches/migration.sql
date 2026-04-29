-- CreateTable
CREATE TABLE "ManualUpcomingMatch" (
    "id" TEXT NOT NULL,
    "homePairName" TEXT NOT NULL DEFAULT '',
    "awayPairName" TEXT NOT NULL DEFAULT '',
    "courtName" TEXT NOT NULL DEFAULT '',
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "arenaId" TEXT NOT NULL,

    CONSTRAINT "ManualUpcomingMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualUpcomingMatch_arenaId_displayOrder_idx" ON "ManualUpcomingMatch"("arenaId", "displayOrder");

-- AddForeignKey
ALTER TABLE "ManualUpcomingMatch" ADD CONSTRAINT "ManualUpcomingMatch_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
