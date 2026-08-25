CREATE TABLE "PlayerNotification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'LEAGUE_CHALLENGE',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL DEFAULT '',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playerId" TEXT NOT NULL,
    CONSTRAINT "PlayerNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeagueChallenge" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "proposedStartsAt" TIMESTAMP(3) NOT NULL,
    "proposedEndsAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "arenaId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "categoryMatchId" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "proposerPairId" TEXT NOT NULL,
    "opponentPairId" TEXT NOT NULL,
    "responderId" TEXT,
    CONSTRAINT "LeagueChallenge_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ScheduleOccurrence" ADD COLUMN "challengeId" TEXT;

CREATE UNIQUE INDEX "LeagueChallenge_categoryMatchId_key" ON "LeagueChallenge"("categoryMatchId");
CREATE UNIQUE INDEX "ScheduleOccurrence_challengeId_key" ON "ScheduleOccurrence"("challengeId");
CREATE INDEX "PlayerNotification_playerId_readAt_createdAt_idx" ON "PlayerNotification"("playerId", "readAt", "createdAt");
CREATE INDEX "LeagueChallenge_arenaId_status_createdAt_idx" ON "LeagueChallenge"("arenaId", "status", "createdAt");
CREATE INDEX "LeagueChallenge_opponentPairId_status_idx" ON "LeagueChallenge"("opponentPairId", "status");
CREATE INDEX "LeagueChallenge_proposerPairId_status_idx" ON "LeagueChallenge"("proposerPairId", "status");

ALTER TABLE "PlayerNotification" ADD CONSTRAINT "PlayerNotification_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueChallenge" ADD CONSTRAINT "LeagueChallenge_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueChallenge" ADD CONSTRAINT "LeagueChallenge_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "CategoryCompetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueChallenge" ADD CONSTRAINT "LeagueChallenge_categoryMatchId_fkey" FOREIGN KEY ("categoryMatchId") REFERENCES "CategoryMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueChallenge" ADD CONSTRAINT "LeagueChallenge_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeagueChallenge" ADD CONSTRAINT "LeagueChallenge_proposerPairId_fkey" FOREIGN KEY ("proposerPairId") REFERENCES "CategoryPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueChallenge" ADD CONSTRAINT "LeagueChallenge_opponentPairId_fkey" FOREIGN KEY ("opponentPairId") REFERENCES "CategoryPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueChallenge" ADD CONSTRAINT "LeagueChallenge_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduleOccurrence" ADD CONSTRAINT "ScheduleOccurrence_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "LeagueChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
