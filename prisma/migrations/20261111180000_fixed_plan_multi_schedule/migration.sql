ALTER TABLE "ScheduleBookingSeries" ADD COLUMN "fixedPlanEnrollmentId" TEXT;
CREATE INDEX "ScheduleBookingSeries_arenaId_fixedPlanEnrollmentId_idx" ON "ScheduleBookingSeries"("arenaId", "fixedPlanEnrollmentId");
