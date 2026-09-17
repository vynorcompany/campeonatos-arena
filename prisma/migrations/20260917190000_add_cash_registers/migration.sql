CREATE TABLE "CashRegister" (
  "id" TEXT NOT NULL,
  "referenceDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "openingAmountCents" INTEGER NOT NULL DEFAULT 0,
  "expectedAmountCents" INTEGER NOT NULL DEFAULT 0,
  "countedAmountCents" INTEGER,
  "differenceCents" INTEGER,
  "openingNotes" TEXT NOT NULL DEFAULT '',
  "closingNotes" TEXT NOT NULL DEFAULT '',
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "openedByName" TEXT NOT NULL DEFAULT '',
  "closedByName" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "CashRegister_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CashMovement" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByName" TEXT NOT NULL DEFAULT '',
  "arenaId" TEXT NOT NULL,
  "registerId" TEXT NOT NULL,
  CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CashRegister_arenaId_referenceDate_key" ON "CashRegister"("arenaId", "referenceDate");
CREATE INDEX "CashRegister_arenaId_status_referenceDate_idx" ON "CashRegister"("arenaId", "status", "referenceDate");
CREATE INDEX "CashMovement_registerId_createdAt_idx" ON "CashMovement"("registerId", "createdAt");
CREATE INDEX "CashMovement_arenaId_createdAt_idx" ON "CashMovement"("arenaId", "createdAt");
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "CashRegister"("id") ON DELETE CASCADE ON UPDATE CASCADE;
