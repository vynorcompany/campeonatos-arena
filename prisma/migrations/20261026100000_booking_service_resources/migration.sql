-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "bookingConcurrentLimit" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "showOnPortalBooking" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ScheduleServiceReservation" (
    "id" TEXT NOT NULL,
    "arenaId" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleServiceReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleServiceReservation_arenaId_productId_occurrenceId_idx" ON "ScheduleServiceReservation"("arenaId", "productId", "occurrenceId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleServiceReservation_occurrenceId_productId_key" ON "ScheduleServiceReservation"("occurrenceId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleOccurrence_arenaId_id_key" ON "ScheduleOccurrence"("arenaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Product_arenaId_id_key" ON "Product"("arenaId", "id");

-- AddForeignKey
ALTER TABLE "ScheduleServiceReservation" ADD CONSTRAINT "ScheduleServiceReservation_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleServiceReservation" ADD CONSTRAINT "ScheduleServiceReservation_arenaId_occurrenceId_fkey" FOREIGN KEY ("arenaId", "occurrenceId") REFERENCES "ScheduleOccurrence"("arenaId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleServiceReservation" ADD CONSTRAINT "ScheduleServiceReservation_arenaId_productId_fkey" FOREIGN KEY ("arenaId", "productId") REFERENCES "Product"("arenaId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "Product" ADD CONSTRAINT "Product_booking_concurrent_limit_check" CHECK ("bookingConcurrentLimit" BETWEEN 1 AND 1000);
ALTER TABLE "ScheduleServiceReservation" ADD CONSTRAINT "ScheduleServiceReservation_price_check" CHECK ("priceCents" >= 0);
ALTER TABLE "ScheduleServiceReservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScheduleServiceReservation" FORCE ROW LEVEL SECURITY;
CREATE POLICY "ScheduleServiceReservation_arena_isolation" ON "ScheduleServiceReservation"
  USING ("arenaId" = current_setting('app.arena_id', true))
  WITH CHECK ("arenaId" = current_setting('app.arena_id', true));
GRANT SELECT, INSERT, UPDATE, DELETE ON "ScheduleServiceReservation" TO arena_runtime;
