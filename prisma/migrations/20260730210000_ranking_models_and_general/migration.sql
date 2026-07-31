-- CreateEnum
CREATE TYPE "RankingModel" AS ENUM ('LEAGUE', 'KNOCKOUT');

-- AlterTable
ALTER TABLE "RankingProfile"
ADD COLUMN "model" "RankingModel" NOT NULL DEFAULT 'KNOCKOUT',
ADD COLUMN "isGeneral" BOOLEAN NOT NULL DEFAULT false;

-- A General Ranking must also be an individual ranking.
ALTER TABLE "RankingProfile"
ADD CONSTRAINT "RankingProfile_general_is_individual_check"
CHECK (NOT "isGeneral" OR "type" = 'INDIVIDUAL');

-- CreateIndex
CREATE INDEX "RankingProfile_arenaId_isGeneral_idx"
ON "RankingProfile"("arenaId", "isGeneral");

-- PostgreSQL partial uniqueness keeps regular rankings unrestricted while
-- allowing at most one General Ranking for each arena.
CREATE UNIQUE INDEX "RankingProfile_one_general_per_arena"
ON "RankingProfile"("arenaId")
WHERE "isGeneral" = true;
