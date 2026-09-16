ALTER TABLE "LessonAttendance" ADD COLUMN "makeupRequestedAt" TIMESTAMP(3);
ALTER TABLE "LessonAttendance" ADD COLUMN "makeupExpiresAt" TIMESTAMP(3);

CREATE INDEX "LessonAttendance_studentId_makeupRequestedAt_makeupExpiresAt_idx"
ON "LessonAttendance"("studentId", "makeupRequestedAt", "makeupExpiresAt");
