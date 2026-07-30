-- CreateEnum
CREATE TYPE "CompetitionFormat" AS ENUM ('LEAGUE', 'THREE_GROUPS', 'FOUR_GROUPS', 'SIMPLE');

-- CreateEnum
CREATE TYPE "RankingType" AS ENUM ('INDIVIDUAL', 'PAIR');

-- AlterTable
ALTER TABLE "TournamentCategory"
  ADD COLUMN "class" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "gender" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "RankingProfile" ADD COLUMN "type" "RankingType" NOT NULL DEFAULT 'PAIR';

-- AlterTable
ALTER TABLE "PublicTournamentRegistration" ADD COLUMN "competitionId" TEXT;

-- CreateTable
CREATE TABLE "CategoryCompetition" (
    "id" TEXT NOT NULL,
    "format" "CompetitionFormat" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "feedsGeneralRanking" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "rankingId" TEXT,

    CONSTRAINT "CategoryCompetition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryPair" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "drawOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "competitionId" TEXT NOT NULL,
    "groupId" TEXT,

    CONSTRAINT "CategoryPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryPairPlayer" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,

    CONSTRAINT "CategoryPairPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "drawOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "competitionId" TEXT NOT NULL,

    CONSTRAINT "CategoryGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryMatch" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "roundOrder" INTEGER NOT NULL,
    "courtName" TEXT,
    "scheduledTime" TEXT,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "manualStatus" TEXT,
    "showOnTv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "competitionId" TEXT NOT NULL,
    "groupId" TEXT,
    "homePairId" TEXT,
    "awayPairId" TEXT,
    "winnerPairId" TEXT,

    CONSTRAINT "CategoryMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicTournamentRegistration_competitionId_createdAt_idx" ON "PublicTournamentRegistration"("competitionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryCompetition_categoryId_key" ON "CategoryCompetition"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryCompetition_rankingId_idx" ON "CategoryCompetition"("rankingId");

-- CreateIndex
CREATE INDEX "CategoryCompetition_status_idx" ON "CategoryCompetition"("status");

-- CreateIndex
CREATE INDEX "CategoryPair_competitionId_drawOrder_idx" ON "CategoryPair"("competitionId", "drawOrder");

-- CreateIndex
CREATE INDEX "CategoryPair_competitionId_totalPoints_idx" ON "CategoryPair"("competitionId", "totalPoints");

-- CreateIndex
CREATE INDEX "CategoryPair_groupId_idx" ON "CategoryPair"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryPairPlayer_pairId_playerId_key" ON "CategoryPairPlayer"("pairId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryPairPlayer_pairId_slot_key" ON "CategoryPairPlayer"("pairId", "slot");

-- CreateIndex
CREATE INDEX "CategoryPairPlayer_playerId_idx" ON "CategoryPairPlayer"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryGroup_competitionId_name_key" ON "CategoryGroup"("competitionId", "name");

-- CreateIndex
CREATE INDEX "CategoryGroup_competitionId_drawOrder_idx" ON "CategoryGroup"("competitionId", "drawOrder");

-- CreateIndex
CREATE INDEX "CategoryMatch_competitionId_stage_roundOrder_idx" ON "CategoryMatch"("competitionId", "stage", "roundOrder");

-- CreateIndex
CREATE INDEX "CategoryMatch_groupId_idx" ON "CategoryMatch"("groupId");

-- CreateIndex
CREATE INDEX "CategoryMatch_winnerPairId_idx" ON "CategoryMatch"("winnerPairId");

-- AddForeignKey
ALTER TABLE "PublicTournamentRegistration" ADD CONSTRAINT "PublicTournamentRegistration_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "CategoryCompetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryCompetition" ADD CONSTRAINT "CategoryCompetition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TournamentCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryCompetition" ADD CONSTRAINT "CategoryCompetition_rankingId_fkey" FOREIGN KEY ("rankingId") REFERENCES "RankingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPair" ADD CONSTRAINT "CategoryPair_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "CategoryCompetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPair" ADD CONSTRAINT "CategoryPair_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CategoryGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPairPlayer" ADD CONSTRAINT "CategoryPairPlayer_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "CategoryPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPairPlayer" ADD CONSTRAINT "CategoryPairPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryGroup" ADD CONSTRAINT "CategoryGroup_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "CategoryCompetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryMatch" ADD CONSTRAINT "CategoryMatch_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "CategoryCompetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryMatch" ADD CONSTRAINT "CategoryMatch_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CategoryGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryMatch" ADD CONSTRAINT "CategoryMatch_homePairId_fkey" FOREIGN KEY ("homePairId") REFERENCES "CategoryPair"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryMatch" ADD CONSTRAINT "CategoryMatch_awayPairId_fkey" FOREIGN KEY ("awayPairId") REFERENCES "CategoryPair"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryMatch" ADD CONSTRAINT "CategoryMatch_winnerPairId_fkey" FOREIGN KEY ("winnerPairId") REFERENCES "CategoryPair"("id") ON DELETE SET NULL ON UPDATE CASCADE;
