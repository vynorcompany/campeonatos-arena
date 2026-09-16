ALTER TABLE "ScheduleOccurrence" ADD COLUMN "responsiblePlayerId" TEXT;
ALTER TABLE "ScheduleBookingSeries" ADD COLUMN "responsiblePlayerId" TEXT;

CREATE INDEX "ScheduleOccurrence_responsiblePlayerId_idx" ON "ScheduleOccurrence"("responsiblePlayerId");
CREATE INDEX "ScheduleBookingSeries_responsiblePlayerId_idx" ON "ScheduleBookingSeries"("responsiblePlayerId");

ALTER TABLE "ScheduleOccurrence" ADD CONSTRAINT "ScheduleOccurrence_responsiblePlayerId_fkey" FOREIGN KEY ("responsiblePlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduleBookingSeries" ADD CONSTRAINT "ScheduleBookingSeries_responsiblePlayerId_fkey" FOREIGN KEY ("responsiblePlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
