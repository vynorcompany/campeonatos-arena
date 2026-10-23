ALTER TABLE "Arena" ADD COLUMN "checkinEnabled" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "checkinToken" TEXT;
CREATE UNIQUE INDEX "Arena_checkinToken_key" ON "Arena"("checkinToken");
ALTER TABLE "ScheduleParticipant" ADD COLUMN "checkedInAt" TIMESTAMP(3);
CREATE TABLE "CheckinRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "arenaId" TEXT NOT NULL REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "occurrenceId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "playerName" TEXT NOT NULL,
  "courtId" TEXT NOT NULL,
  "courtName" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "financialEntryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "CheckinRecord_occurrenceId_playerId_key" ON "CheckinRecord"("occurrenceId", "playerId");
CREATE INDEX "CheckinRecord_arenaId_createdAt_idx" ON "CheckinRecord"("arenaId", "createdAt");
CREATE INDEX "CheckinRecord_arenaId_playerId_startsAt_idx" ON "CheckinRecord"("arenaId", "playerId", "startsAt");
ALTER TABLE "CheckinRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CheckinRecord" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON "CheckinRecord" TO arena_runtime;
CREATE POLICY "checkin_read" ON "CheckinRecord" FOR SELECT USING ("arenaId" = (SELECT public.current_arena_id()));
CREATE POLICY "checkin_insert" ON "CheckinRecord" FOR INSERT WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));
