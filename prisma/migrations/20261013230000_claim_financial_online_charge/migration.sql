ALTER TABLE "FinancialEntry"
  ADD COLUMN "onlinePaymentClaimMethod" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "onlinePaymentClaimedAt" TIMESTAMP(3);
