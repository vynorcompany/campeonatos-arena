ALTER TABLE "ScheduleOccurrence" ADD COLUMN "bookingTypeName" TEXT NOT NULL DEFAULT 'Reserva';

CREATE TABLE "BookingType" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "BookingType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BookingType_arenaId_name_key" ON "BookingType"("arenaId", "name");
CREATE INDEX "BookingType_arenaId_active_idx" ON "BookingType"("arenaId", "active");
ALTER TABLE "BookingType" ADD CONSTRAINT "BookingType_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
