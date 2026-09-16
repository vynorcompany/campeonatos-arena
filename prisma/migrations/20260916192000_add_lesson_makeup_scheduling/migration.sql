ALTER TABLE "LessonAttendance" ADD COLUMN "makeupScheduledAt" TIMESTAMP(3);
ALTER TABLE "LessonAttendance" ADD COLUMN "makeupOccurrenceId" TEXT;

CREATE INDEX "LessonAttendance_studentId_status_makeupScheduledAt_idx"
ON "LessonAttendance"("studentId", "status", "makeupScheduledAt");
