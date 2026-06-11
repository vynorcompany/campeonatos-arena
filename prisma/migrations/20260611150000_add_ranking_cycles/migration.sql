CREATE TABLE "RankingCycle" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rankingId" TEXT NOT NULL,

    CONSTRAINT "RankingCycle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RankingCycle_rankingId_startedAt_idx" ON "RankingCycle"("rankingId", "startedAt");
CREATE INDEX "RankingCycle_rankingId_endedAt_idx" ON "RankingCycle"("rankingId", "endedAt");

ALTER TABLE "RankingCycle" ADD CONSTRAINT "RankingCycle_rankingId_fkey" FOREIGN KEY ("rankingId") REFERENCES "RankingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
