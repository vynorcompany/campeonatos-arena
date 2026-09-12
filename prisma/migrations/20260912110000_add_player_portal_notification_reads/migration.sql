CREATE TABLE "PlayerPortalNotificationRead" (
    "id" TEXT NOT NULL,
    "notificationKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "PlayerPortalNotificationRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerPortalNotificationRead_playerId_notificationKey_key"
ON "PlayerPortalNotificationRead"("playerId", "notificationKey");

CREATE INDEX "PlayerPortalNotificationRead_playerId_readAt_idx"
ON "PlayerPortalNotificationRead"("playerId", "readAt");

ALTER TABLE "PlayerPortalNotificationRead"
ADD CONSTRAINT "PlayerPortalNotificationRead_playerId_fkey"
FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
