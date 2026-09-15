ALTER TABLE "PortalEventPost"
  ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;

DROP INDEX IF EXISTS "PortalEventPost_arenaId_active_createdAt_idx";
CREATE INDEX "PortalEventPost_arenaId_active_pinned_createdAt_idx"
  ON "PortalEventPost"("arenaId", "active", "pinned", "createdAt");
