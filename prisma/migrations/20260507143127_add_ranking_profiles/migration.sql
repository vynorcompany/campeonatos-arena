-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "rankingId" TEXT;

-- CreateTable
CREATE TABLE "RankingProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "arenaId" TEXT NOT NULL,

    CONSTRAINT "RankingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingRule" (
    "id" TEXT NOT NULL,
    "stageKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rankingId" TEXT NOT NULL,

    CONSTRAINT "RankingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RankingProfile_arenaId_active_idx" ON "RankingProfile"("arenaId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "RankingProfile_arenaId_name_key" ON "RankingProfile"("arenaId", "name");

-- CreateIndex
CREATE INDEX "RankingRule_rankingId_displayOrder_idx" ON "RankingRule"("rankingId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RankingRule_rankingId_stageKey_key" ON "RankingRule"("rankingId", "stageKey");

-- CreateIndex
CREATE INDEX "Tournament_rankingId_idx" ON "Tournament"("rankingId");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_rankingId_fkey" FOREIGN KEY ("rankingId") REFERENCES "RankingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingProfile" ADD CONSTRAINT "RankingProfile_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingRule" ADD CONSTRAINT "RankingRule_rankingId_fkey" FOREIGN KEY ("rankingId") REFERENCES "RankingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
