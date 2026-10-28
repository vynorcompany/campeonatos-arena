ALTER TABLE "Product" ADD COLUMN "serviceHourly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ComandaItem" ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "ComandaItem" ADD CONSTRAINT "ComandaItem_durationMinutes_check" CHECK ("durationMinutes" BETWEEN 1 AND 1440);
