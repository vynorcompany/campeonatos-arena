ALTER TABLE "TvPresentationSettings"
ADD COLUMN "selectedRankingIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
