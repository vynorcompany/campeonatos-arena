-- CreateTable
CREATE TABLE "Court" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "arenaId" TEXT NOT NULL,

    CONSTRAINT "Court_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleOccurrence" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "arenaId" TEXT NOT NULL,

    CONSTRAINT "ScheduleOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleOccurrenceCourt" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,

    CONSTRAINT "ScheduleOccurrenceCourt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Court_arenaId_name_key" ON "Court"("arenaId", "name");
CREATE INDEX "Court_arenaId_active_idx" ON "Court"("arenaId", "active");
CREATE INDEX "ScheduleOccurrence_arenaId_startsAt_endsAt_idx" ON "ScheduleOccurrence"("arenaId", "startsAt", "endsAt");
CREATE UNIQUE INDEX "ScheduleOccurrenceCourt_occurrenceId_courtId_key" ON "ScheduleOccurrenceCourt"("occurrenceId", "courtId");
CREATE INDEX "ScheduleOccurrenceCourt_courtId_idx" ON "ScheduleOccurrenceCourt"("courtId");

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleOccurrence" ADD CONSTRAINT "ScheduleOccurrence_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleOccurrenceCourt" ADD CONSTRAINT "ScheduleOccurrenceCourt_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "ScheduleOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleOccurrenceCourt" ADD CONSTRAINT "ScheduleOccurrenceCourt_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;
