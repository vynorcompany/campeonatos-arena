CREATE TABLE "CategoryPairSubstitution" (
    "id" TEXT NOT NULL,
    "previousPlayerId" TEXT NOT NULL,
    "replacementPlayerId" TEXT NOT NULL,
    "previousPlayerName" TEXT NOT NULL,
    "replacementPlayerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pairId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,

    CONSTRAINT "CategoryPairSubstitution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CategoryPairSubstitution_competitionId_createdAt_idx" ON "CategoryPairSubstitution"("competitionId", "createdAt");
CREATE INDEX "CategoryPairSubstitution_pairId_createdAt_idx" ON "CategoryPairSubstitution"("pairId", "createdAt");

ALTER TABLE "CategoryPairSubstitution"
ADD CONSTRAINT "CategoryPairSubstitution_pairId_competitionId_fkey"
FOREIGN KEY ("pairId", "competitionId") REFERENCES "CategoryPair"("id", "competitionId")
ON DELETE CASCADE ON UPDATE CASCADE;
