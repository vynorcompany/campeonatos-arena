-- Additional inventory consumed per unit sold. Product retains its existing RLS.
ALTER TABLE "Product" ADD COLUMN "stockAggregates" JSONB NOT NULL DEFAULT '[]';
