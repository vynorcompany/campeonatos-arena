-- AlterTable
ALTER TABLE "Player"
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "gender" TEXT;

UPDATE "Player" SET "category" = '' WHERE "category" IS NULL;
UPDATE "Player" SET "gender" = '' WHERE "gender" IS NULL;

ALTER TABLE "Player"
  ALTER COLUMN "category" SET DEFAULT '',
  ALTER COLUMN "category" SET NOT NULL,
  ALTER COLUMN "gender" SET DEFAULT '',
  ALTER COLUMN "gender" SET NOT NULL;

-- Replace cascading athlete deletion with history-preserving restriction
ALTER TABLE "CategoryPairPlayer" DROP CONSTRAINT "CategoryPairPlayer_playerId_fkey";
ALTER TABLE "CategoryPairPlayer" ADD CONSTRAINT "CategoryPairPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve historical individual leaderboards while new unlinked profiles remain pair rankings
UPDATE "RankingProfile" AS ranking
SET "type" = 'INDIVIDUAL'
WHERE EXISTS (
  SELECT 1
  FROM "Tournament" AS tournament
  WHERE tournament."rankingId" = ranking."id"
)
AND NOT EXISTS (
  SELECT 1
  FROM "CategoryCompetition" AS competition
  WHERE competition."rankingId" = ranking."id"
);

-- CreateTable
CREATE TABLE "CategoryRankingApplication" (
    "id" TEXT NOT NULL,
    "feedsGeneralRanking" BOOLEAN NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "competitionId" TEXT NOT NULL,
    "rankingId" TEXT,

    CONSTRAINT "CategoryRankingApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryRankingApplication_competitionId_key" ON "CategoryRankingApplication"("competitionId");

-- CreateIndex
CREATE INDEX "CategoryRankingApplication_rankingId_idx" ON "CategoryRankingApplication"("rankingId");

-- AddForeignKey
ALTER TABLE "CategoryRankingApplication" ADD CONSTRAINT "CategoryRankingApplication_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "CategoryCompetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRankingApplication" ADD CONSTRAINT "CategoryRankingApplication_rankingId_fkey" FOREIGN KEY ("rankingId") REFERENCES "RankingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
