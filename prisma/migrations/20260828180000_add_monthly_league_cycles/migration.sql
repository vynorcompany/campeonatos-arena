ALTER TABLE "CategoryMatch"
  ADD COLUMN "leagueCycleId" TEXT,
  ADD COLUMN "leagueBlock" INTEGER,
  ADD COLUMN "hostProposalDeadline" TIMESTAMP(3),
  ADD COLUMN "woReason" TEXT;

ALTER TABLE "CategoryCompetition" ADD COLUMN "leagueTier" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CategoryPair" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "CategoryPair_competitionId_active_drawOrder_idx" ON "CategoryPair"("competitionId", "active", "drawOrder");

CREATE TABLE "LeagueCycle" (
  "id" TEXT NOT NULL,
  "referenceMonth" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "championPairId" TEXT,
  "promotedPairId" TEXT,
  "relegatedPairId" TEXT,
  "prizeDescription" TEXT NOT NULL DEFAULT '',
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "competitionId" TEXT NOT NULL,
  CONSTRAINT "LeagueCycle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeagueMatchProposal" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "responseDueAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  "proposerPairId" TEXT NOT NULL,
  "opponentPairId" TEXT NOT NULL,
  "courtId" TEXT NOT NULL,
  "categoryMatchId" TEXT NOT NULL,
  CONSTRAINT "LeagueMatchProposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeagueMedicalSubstitutionRequest" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reason" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewNotes" TEXT NOT NULL DEFAULT '',
  "pairId" TEXT NOT NULL,
  "previousPlayerId" TEXT NOT NULL,
  "replacementPlayerId" TEXT NOT NULL,
  "requestedByPlayerId" TEXT NOT NULL,
  CONSTRAINT "LeagueMedicalSubstitutionRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeagueCycle_competitionId_referenceMonth_key" ON "LeagueCycle"("competitionId", "referenceMonth");
CREATE INDEX "LeagueCycle_referenceMonth_status_idx" ON "LeagueCycle"("referenceMonth", "status");
CREATE INDEX "CategoryMatch_leagueCycleId_leagueBlock_idx" ON "CategoryMatch"("leagueCycleId", "leagueBlock");
CREATE INDEX "LeagueMatchProposal_categoryMatchId_status_idx" ON "LeagueMatchProposal"("categoryMatchId", "status");
CREATE INDEX "LeagueMatchProposal_opponentPairId_responseDueAt_idx" ON "LeagueMatchProposal"("opponentPairId", "responseDueAt");
CREATE INDEX "LeagueMedicalSubstitutionRequest_pairId_status_idx" ON "LeagueMedicalSubstitutionRequest"("pairId", "status");
CREATE INDEX "LeagueMedicalSubstitutionRequest_requestedByPlayerId_status_idx" ON "LeagueMedicalSubstitutionRequest"("requestedByPlayerId", "status");

ALTER TABLE "CategoryMatch" ADD CONSTRAINT "CategoryMatch_leagueCycleId_fkey" FOREIGN KEY ("leagueCycleId") REFERENCES "LeagueCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeagueCycle" ADD CONSTRAINT "LeagueCycle_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "CategoryCompetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueMatchProposal" ADD CONSTRAINT "LeagueMatchProposal_categoryMatchId_fkey" FOREIGN KEY ("categoryMatchId") REFERENCES "CategoryMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueMatchProposal" ADD CONSTRAINT "LeagueMatchProposal_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeagueMedicalSubstitutionRequest" ADD CONSTRAINT "LeagueMedicalSubstitutionRequest_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "CategoryPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;
