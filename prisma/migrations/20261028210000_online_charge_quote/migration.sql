ALTER TABLE "FinancialEntry" ADD COLUMN "onlineChargeAmountCents" INTEGER;
ALTER TABLE "FinancialEntry" ADD COLUMN "onlineChargeDiscountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FinancialEntry" ADD COLUMN "onlineChargeInterestCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_onlineChargeQuote_check" CHECK (
 "onlineChargeDiscountCents" >= 0 AND "onlineChargeInterestCents" >= 0 AND
 (("onlineChargeAmountCents" IS NULL AND "onlineChargeDiscountCents" = 0 AND "onlineChargeInterestCents" = 0) OR ("onlineChargeAmountCents" IS NOT NULL AND "onlineChargeAmountCents" > 0))
);
