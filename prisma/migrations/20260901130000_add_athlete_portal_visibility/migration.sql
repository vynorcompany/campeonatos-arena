ALTER TABLE "Arena"
  ADD COLUMN "athletePortalShowLeagues" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "athletePortalShowBooking" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "athletePortalShowReservations" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "athletePortalShowLessons" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "athletePortalShowClasses" BOOLEAN NOT NULL DEFAULT true;
