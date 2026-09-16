ALTER TABLE "Arena" ADD COLUMN "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "PortalAnnouncement"
  ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "linkUrl" TEXT NOT NULL DEFAULT '';

CREATE INDEX "PortalAnnouncement_arenaId_pinned_createdAt_idx"
  ON "PortalAnnouncement"("arenaId", "pinned", "createdAt");
