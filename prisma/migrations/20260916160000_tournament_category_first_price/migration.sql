-- Adds a per-category first-registration price without changing any existing
-- tournament, category, registration or payment record.
ALTER TABLE "TournamentCategory"
ADD COLUMN IF NOT EXISTS "priceFirstCents" INTEGER NOT NULL DEFAULT 0;

-- Existing registrations used the tournament's first-registration price.
-- Copy it once so the new per-category field preserves current pricing.
UPDATE "TournamentCategory" AS category
SET "priceFirstCents" = tournament."priceFirstCents"
FROM "Tournament" AS tournament
WHERE tournament.id = category."tournamentId"
  AND category."priceFirstCents" = 0;
