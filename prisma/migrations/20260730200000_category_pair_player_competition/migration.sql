-- AlterTable
ALTER TABLE "CategoryPairPlayer" ADD COLUMN "competitionId" TEXT;

-- Backfill the owning competition from the pair before enforcing the invariant.
UPDATE "CategoryPairPlayer" AS pair_player
SET "competitionId" = pair."competitionId"
FROM "CategoryPair" AS pair
WHERE pair.id = pair_player."pairId";

ALTER TABLE "CategoryPairPlayer" ALTER COLUMN "competitionId" SET NOT NULL;

-- Replace the single-column relation with a competition-scoped relation.
ALTER TABLE "CategoryPairPlayer"
  DROP CONSTRAINT "CategoryPairPlayer_pairId_fkey";

CREATE UNIQUE INDEX "CategoryPairPlayer_competitionId_playerId_key"
  ON "CategoryPairPlayer"("competitionId", "playerId");

ALTER TABLE "CategoryPairPlayer"
  ADD CONSTRAINT "CategoryPairPlayer_pairId_competitionId_fkey"
  FOREIGN KEY ("pairId", "competitionId")
  REFERENCES "CategoryPair"("id", "competitionId")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
