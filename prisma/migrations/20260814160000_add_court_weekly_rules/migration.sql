CREATE TABLE "CourtWeeklyRule" (
  "id" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "startsAtMinute" INTEGER NOT NULL,
  "endsAtMinute" INTEGER NOT NULL,
  "priceCents" INTEGER NOT NULL DEFAULT 0,
  "available" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "courtId" TEXT NOT NULL,

  CONSTRAINT "CourtWeeklyRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CourtWeeklyRule_courtId_weekday_idx" ON "CourtWeeklyRule"("courtId", "weekday");

ALTER TABLE "CourtWeeklyRule"
  ADD CONSTRAINT "CourtWeeklyRule_courtId_fkey"
  FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;
