ALTER TABLE "ScheduleOccurrence" ADD COLUMN "teacherId" TEXT;

CREATE INDEX "ScheduleOccurrence_teacherId_idx" ON "ScheduleOccurrence"("teacherId");

ALTER TABLE "ScheduleOccurrence" ADD CONSTRAINT "ScheduleOccurrence_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
