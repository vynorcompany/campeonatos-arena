-- Zero keeps existing categories unrestricted. This migration is additive and
-- does not touch existing tournaments, registrations or brackets.
ALTER TABLE "TournamentCategory"
ADD COLUMN IF NOT EXISTS "maxRegistrations" INTEGER NOT NULL DEFAULT 0;
