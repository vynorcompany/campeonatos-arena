ALTER TABLE "Player" ADD COLUMN "padelCategories" TEXT NOT NULL DEFAULT '[]';

UPDATE "Player"
SET "padelCategories" = json_build_array("category")::text
WHERE "category" <> '';
