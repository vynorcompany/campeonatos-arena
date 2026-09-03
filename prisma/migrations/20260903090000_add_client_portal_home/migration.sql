ALTER TABLE "CalendarEvent" ADD COLUMN "featuredInPortal" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "PortalAnnouncement" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "PortalAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PortalAnnouncement_arenaId_active_startsAt_endsAt_idx" ON "PortalAnnouncement"("arenaId", "active", "startsAt", "endsAt");
ALTER TABLE "PortalAnnouncement" ADD CONSTRAINT "PortalAnnouncement_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
