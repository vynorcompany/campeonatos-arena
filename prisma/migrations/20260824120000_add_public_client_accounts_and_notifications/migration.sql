CREATE TABLE "PlayerAccount" (
    "id" TEXT NOT NULL,
    "arenaId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "playerId" TEXT NOT NULL,
    CONSTRAINT "PlayerAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playerAccountId" TEXT NOT NULL,
    CONSTRAINT "PlayerSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArenaNotification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ONLINE_BOOKING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL DEFAULT '',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arenaId" TEXT NOT NULL,
    CONSTRAINT "ArenaNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerAccount_playerId_key" ON "PlayerAccount"("playerId");
CREATE UNIQUE INDEX "PlayerAccount_arenaId_phone_key" ON "PlayerAccount"("arenaId", "phone");
CREATE INDEX "PlayerAccount_arenaId_idx" ON "PlayerAccount"("arenaId");
CREATE UNIQUE INDEX "PlayerSession_token_key" ON "PlayerSession"("token");
CREATE INDEX "PlayerSession_playerAccountId_idx" ON "PlayerSession"("playerAccountId");
CREATE INDEX "PlayerSession_expiresAt_idx" ON "PlayerSession"("expiresAt");
CREATE INDEX "ArenaNotification_arenaId_readAt_createdAt_idx" ON "ArenaNotification"("arenaId", "readAt", "createdAt");

ALTER TABLE "PlayerAccount" ADD CONSTRAINT "PlayerAccount_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerSession" ADD CONSTRAINT "PlayerSession_playerAccountId_fkey" FOREIGN KEY ("playerAccountId") REFERENCES "PlayerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArenaNotification" ADD CONSTRAINT "ArenaNotification_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
