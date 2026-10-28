ALTER TABLE "FinancialSettlement" ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FinancialSettlement" ADD CONSTRAINT "FinancialSettlement_discountCents_check" CHECK ("discountCents" >= 0);
