ALTER TABLE "Court"
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "color" TEXT NOT NULL DEFAULT '#1E5EA8',
  ADD COLUMN "onlineSlotMinutes" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "onlineDurationMinutes" INTEGER[] NOT NULL DEFAULT ARRAY[60]::INTEGER[];

WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "arenaId" ORDER BY "createdAt", "id") - 1 AS position
  FROM "Court"
)
UPDATE "Court" AS court
SET "displayOrder" = ordered.position
FROM ordered
WHERE court."id" = ordered."id";

CREATE INDEX "Court_arenaId_active_displayOrder_idx" ON "Court"("arenaId", "active", "displayOrder");
