ALTER TABLE "Product" ADD COLUMN "stockChoices" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "ComandaItem" ADD COLUMN "variantKey" TEXT NOT NULL DEFAULT '', ADD COLUMN "compositionLabel" TEXT NOT NULL DEFAULT '', ADD COLUMN "stockRecipe" JSONB;
ALTER TABLE "ComandaRequest" ADD COLUMN "variantKey" TEXT NOT NULL DEFAULT '', ADD COLUMN "compositionLabel" TEXT NOT NULL DEFAULT '', ADD COLUMN "stockRecipe" JSONB, ADD COLUMN "ingredientChoices" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "SaleItem" ADD COLUMN "variantKey" TEXT NOT NULL DEFAULT '', ADD COLUMN "compositionLabel" TEXT NOT NULL DEFAULT '', ADD COLUMN "stockRecipe" JSONB;
DROP INDEX "ComandaItem_comandaId_productId_key";
CREATE UNIQUE INDEX "ComandaItem_comandaId_productId_variantKey_key" ON "ComandaItem"("comandaId", "productId", "variantKey");
-- Before choice groups existed, only fixed aggregates could be consumed.
-- Capture that existing recipe so future catalog edits do not change open orders.
UPDATE "ComandaItem" i SET "stockRecipe" = p."stockAggregates"
FROM "Product" p, "Comanda" c
WHERE i."productId" = p.id AND i."comandaId" = c.id AND p."arenaId" = c."arenaId" AND i."stockRecipe" IS NULL;
UPDATE "ComandaRequest" r SET "stockRecipe" = p."stockAggregates"
FROM "Product" p, "Comanda" c
WHERE r."productId" = p.id AND r."comandaId" = c.id AND p."arenaId" = c."arenaId" AND r."stockRecipe" IS NULL;
