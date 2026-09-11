ALTER TABLE "FinancialEntry"
  ADD COLUMN "onlineProvider" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "onlinePaymentId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "onlinePaymentUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "onlinePaymentQrCode" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "onlinePaymentExpiresAt" TIMESTAMP(3);

ALTER TABLE "FinancialEntry"
  ADD COLUMN "playerId" TEXT;

ALTER TABLE "FinancialRecurrence"
  ADD COLUMN "playerId" TEXT;

CREATE INDEX "FinancialEntry_arenaId_onlinePaymentId_idx"
  ON "FinancialEntry"("arenaId", "onlinePaymentId");

CREATE INDEX "FinancialEntry_arenaId_playerId_status_idx"
  ON "FinancialEntry"("arenaId", "playerId", "status");

CREATE INDEX "FinancialRecurrence_playerId_idx"
  ON "FinancialRecurrence"("playerId");

ALTER TABLE "FinancialEntry"
  ADD CONSTRAINT "FinancialEntry_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancialRecurrence"
  ADD CONSTRAINT "FinancialRecurrence_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve the connection for existing records only when the player name is unique in the arena.
UPDATE "FinancialEntry" AS entry
SET "playerId" = player."id"
FROM "Player" AS player
WHERE entry."arenaId" = player."arenaId"
  AND entry."counterpartyName" = player."name"
  AND player."active" = true
  AND entry."playerId" IS NULL
  AND 1 = (
    SELECT count(*)
    FROM "Player" AS candidate
    WHERE candidate."arenaId" = entry."arenaId"
      AND candidate."name" = entry."counterpartyName"
      AND candidate."active" = true
  );

UPDATE "FinancialRecurrence" AS recurrence
SET "playerId" = player."id"
FROM "Player" AS player
WHERE recurrence."arenaId" = player."arenaId"
  AND recurrence."counterpartyName" = player."name"
  AND player."active" = true
  AND recurrence."playerId" IS NULL
  AND 1 = (
    SELECT count(*)
    FROM "Player" AS candidate
    WHERE candidate."arenaId" = recurrence."arenaId"
      AND candidate."name" = recurrence."counterpartyName"
      AND candidate."active" = true
  );
