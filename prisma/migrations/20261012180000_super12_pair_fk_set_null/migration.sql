-- Knockout matches may exist before their pairs are known. Removing a pair
-- must leave the match/bracket in place, as modeled by Super12Match.
ALTER TABLE "Super12Match" DROP CONSTRAINT "Super12Match_homePairId_fkey";
ALTER TABLE "Super12Match" DROP CONSTRAINT "Super12Match_awayPairId_fkey";

ALTER TABLE "Super12Match" ADD CONSTRAINT "Super12Match_homePairId_fkey"
  FOREIGN KEY ("homePairId") REFERENCES "Super12Pair"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Super12Match" ADD CONSTRAINT "Super12Match_awayPairId_fkey"
  FOREIGN KEY ("awayPairId") REFERENCES "Super12Pair"("id") ON DELETE SET NULL ON UPDATE CASCADE;
