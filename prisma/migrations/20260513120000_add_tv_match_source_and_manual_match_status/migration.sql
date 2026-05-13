ALTER TABLE "Match"
ADD COLUMN "manualStatus" TEXT;

ALTER TABLE "TvPresentationSettings"
ADD COLUMN "tvMatchSource" TEXT NOT NULL DEFAULT 'MANUAL';
