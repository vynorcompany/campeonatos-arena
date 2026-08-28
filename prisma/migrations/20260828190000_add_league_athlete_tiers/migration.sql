CREATE TABLE "LeagueAthleteTier" (
    "id" TEXT NOT NULL,
    "modality" TEXT NOT NULL DEFAULT 'PADEL',
    "tier" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arenaId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "leagueCycleId" TEXT,

    CONSTRAINT "LeagueAthleteTier_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeagueAthleteTier_arenaId_modality_tier_active_idx" ON "LeagueAthleteTier"("arenaId", "modality", "tier", "active");
CREATE INDEX "LeagueAthleteTier_playerId_modality_active_idx" ON "LeagueAthleteTier"("playerId", "modality", "active");
CREATE INDEX "LeagueAthleteTier_leagueCycleId_idx" ON "LeagueAthleteTier"("leagueCycleId");

ALTER TABLE "LeagueAthleteTier" ADD CONSTRAINT "LeagueAthleteTier_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueAthleteTier" ADD CONSTRAINT "LeagueAthleteTier_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueAthleteTier" ADD CONSTRAINT "LeagueAthleteTier_leagueCycleId_fkey" FOREIGN KEY ("leagueCycleId") REFERENCES "LeagueCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
