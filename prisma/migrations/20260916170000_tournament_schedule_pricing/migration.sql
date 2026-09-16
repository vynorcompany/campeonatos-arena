ALTER TABLE "Tournament"
  ADD COLUMN "startsAt" TIMESTAMP(3),
  ADD COLUMN "endsAt" TIMESTAMP(3),
  ADD COLUMN "registrationOpensAt" TIMESTAMP(3),
  ADD COLUMN "registrationClosesAt" TIMESTAMP(3),
  ADD COLUMN "earlyDiscountCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "earlyDiscountUntil" TIMESTAMP(3),
  ADD COLUMN "firstBonusLimit" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "firstBonusUntil" TIMESTAMP(3);

ALTER TABLE "PublicTournamentRegistration"
  ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0;
