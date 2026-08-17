CREATE TABLE "Comanda" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'CLIENT',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  "playerId" TEXT,
  CONSTRAINT "Comanda_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Comanda_code_key" ON "Comanda"("code");
CREATE INDEX "Comanda_arenaId_openedAt_idx" ON "Comanda"("arenaId", "openedAt");
CREATE INDEX "Comanda_arenaId_status_idx" ON "Comanda"("arenaId", "status");
CREATE INDEX "Comanda_playerId_idx" ON "Comanda"("playerId");

ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
