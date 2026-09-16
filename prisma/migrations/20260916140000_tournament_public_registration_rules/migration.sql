ALTER TABLE "Tournament" ADD COLUMN "responsibleName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Tournament" ADD COLUMN "responsiblePhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TournamentCategory" ADD COLUMN "standardKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TournamentCategory" ADD COLUMN "allowedRegistrationCategoryIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
