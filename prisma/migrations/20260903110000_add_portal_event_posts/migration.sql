CREATE TABLE "PortalEventPost" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "caption" TEXT NOT NULL DEFAULT '',
  "imageUrl" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "PortalEventPost_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PortalEventPost_arenaId_active_createdAt_idx" ON "PortalEventPost"("arenaId", "active", "createdAt");
ALTER TABLE "PortalEventPost" ADD CONSTRAINT "PortalEventPost_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
