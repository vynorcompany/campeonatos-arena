CREATE TABLE "Super12Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'ROUND_ROBIN',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "groupCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "arenaId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "Super12Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Super12Pair" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "drawOrder" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "groupId" TEXT,
    CONSTRAINT "Super12Pair_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Super12PairPlayer" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    CONSTRAINT "Super12PairPlayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Super12Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "drawOrder" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    CONSTRAINT "Super12Group_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Super12Match" (
    "id" TEXT NOT NULL,
    "roundOrder" INTEGER NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "homePairId" TEXT NOT NULL,
    "awayPairId" TEXT NOT NULL,
    CONSTRAINT "Super12Match_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Super12Event_arenaId_status_createdAt_idx" ON "Super12Event"("arenaId", "status", "createdAt");
CREATE INDEX "Super12Event_creatorId_createdAt_idx" ON "Super12Event"("creatorId", "createdAt");
CREATE INDEX "Super12Pair_eventId_drawOrder_idx" ON "Super12Pair"("eventId", "drawOrder");
CREATE INDEX "Super12Pair_groupId_idx" ON "Super12Pair"("groupId");
CREATE UNIQUE INDEX "Super12PairPlayer_pairId_playerId_key" ON "Super12PairPlayer"("pairId", "playerId");
CREATE UNIQUE INDEX "Super12PairPlayer_pairId_slot_key" ON "Super12PairPlayer"("pairId", "slot");
CREATE INDEX "Super12PairPlayer_playerId_idx" ON "Super12PairPlayer"("playerId");
CREATE UNIQUE INDEX "Super12Group_eventId_name_key" ON "Super12Group"("eventId", "name");
CREATE INDEX "Super12Group_eventId_drawOrder_idx" ON "Super12Group"("eventId", "drawOrder");
CREATE INDEX "Super12Match_eventId_roundOrder_idx" ON "Super12Match"("eventId", "roundOrder");
CREATE INDEX "Super12Match_groupId_idx" ON "Super12Match"("groupId");

ALTER TABLE "Super12Event" ADD CONSTRAINT "Super12Event_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Super12Event" ADD CONSTRAINT "Super12Event_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Super12Pair" ADD CONSTRAINT "Super12Pair_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Super12Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Super12Pair" ADD CONSTRAINT "Super12Pair_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Super12Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Super12PairPlayer" ADD CONSTRAINT "Super12PairPlayer_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "Super12Pair"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Super12PairPlayer" ADD CONSTRAINT "Super12PairPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Super12Group" ADD CONSTRAINT "Super12Group_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Super12Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Super12Match" ADD CONSTRAINT "Super12Match_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Super12Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Super12Match" ADD CONSTRAINT "Super12Match_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Super12Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Super12Match" ADD CONSTRAINT "Super12Match_homePairId_fkey" FOREIGN KEY ("homePairId") REFERENCES "Super12Pair"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Super12Match" ADD CONSTRAINT "Super12Match_awayPairId_fkey" FOREIGN KEY ("awayPairId") REFERENCES "Super12Pair"("id") ON DELETE CASCADE ON UPDATE CASCADE;
