CREATE TABLE "ClientBalanceMovement" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL DEFAULT 0,
  "classesDelta" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "arenaId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  CONSTRAINT "ClientBalanceMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientBalanceMovement_arenaId_createdAt_idx" ON "ClientBalanceMovement"("arenaId", "createdAt");
CREATE INDEX "ClientBalanceMovement_playerId_createdAt_idx" ON "ClientBalanceMovement"("playerId", "createdAt");
ALTER TABLE "ClientBalanceMovement" ADD CONSTRAINT "ClientBalanceMovement_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientBalanceMovement" ADD CONSTRAINT "ClientBalanceMovement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
