CREATE TABLE "ScheduleBookingSeries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bookingTypeName" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT NOT NULL DEFAULT '',
    "teacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "arenaId" TEXT NOT NULL,
    CONSTRAINT "ScheduleBookingSeries_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ScheduleOccurrence" ADD COLUMN "bookingSeriesId" TEXT;

CREATE INDEX "ScheduleBookingSeries_arenaId_status_startsAt_idx" ON "ScheduleBookingSeries"("arenaId", "status", "startsAt");
CREATE INDEX "ScheduleBookingSeries_teacherId_idx" ON "ScheduleBookingSeries"("teacherId");
CREATE INDEX "ScheduleOccurrence_bookingSeriesId_startsAt_idx" ON "ScheduleOccurrence"("bookingSeriesId", "startsAt");

ALTER TABLE "ScheduleBookingSeries" ADD CONSTRAINT "ScheduleBookingSeries_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleBookingSeries" ADD CONSTRAINT "ScheduleBookingSeries_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduleOccurrence" ADD CONSTRAINT "ScheduleOccurrence_bookingSeriesId_fkey" FOREIGN KEY ("bookingSeriesId") REFERENCES "ScheduleBookingSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
