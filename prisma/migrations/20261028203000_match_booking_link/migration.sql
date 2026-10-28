ALTER TABLE "ScheduleOccurrence" ADD COLUMN "categoryMatchId" TEXT;
CREATE INDEX "ScheduleOccurrence_categoryMatchId_idx" ON "ScheduleOccurrence"("categoryMatchId");
ALTER TABLE "ScheduleOccurrence" ADD CONSTRAINT "ScheduleOccurrence_categoryMatchId_fkey" FOREIGN KEY ("categoryMatchId") REFERENCES "CategoryMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
