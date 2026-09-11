ALTER TABLE "Player"
  ADD COLUMN "addressZipCode" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "addressStreet" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "addressNumber" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "addressNeighborhood" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "addressCity" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "addressState" TEXT NOT NULL DEFAULT '';

ALTER TABLE "FinancialEntry"
  ADD COLUMN "onlinePaymentPublishedAt" TIMESTAMP(3),
  ADD COLUMN "onlinePaymentViewedAt" TIMESTAMP(3);
