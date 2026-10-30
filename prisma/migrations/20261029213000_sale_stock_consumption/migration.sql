-- Preserve historical ingredient consumption for reconciliation with a sale's fiscal document.
-- NULL deliberately means that an older sale has no captured recipe; do not reconstruct history.
ALTER TABLE "Sale" ADD COLUMN "stockConsumption" JSONB;
