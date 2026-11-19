-- Preserve the canonical net amount and all existing financial history.
-- NULL means the composition at creation was not recorded; do not invent it.
ALTER TABLE "FinancialEntry"
  ADD COLUMN "originalAmountCents" INTEGER,
  ADD COLUMN "creationInterestCents" INTEGER,
  ADD COLUMN "creationDiscountCents" INTEGER;
ALTER TABLE "FinancialRecurrence"
  ADD COLUMN "originalAmountCents" INTEGER,
  ADD COLUMN "creationInterestCents" INTEGER,
  ADD COLUMN "creationDiscountCents" INTEGER;
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_creation_composition_nonnegative" CHECK (
  ("originalAmountCents" IS NULL OR "originalAmountCents" >= 0) AND
  ("creationInterestCents" IS NULL OR "creationInterestCents" >= 0) AND
  ("creationDiscountCents" IS NULL OR "creationDiscountCents" >= 0));
ALTER TABLE "FinancialRecurrence" ADD CONSTRAINT "FinancialRecurrence_creation_composition_nonnegative" CHECK (
  ("originalAmountCents" IS NULL OR "originalAmountCents" >= 0) AND
  ("creationInterestCents" IS NULL OR "creationInterestCents" >= 0) AND
  ("creationDiscountCents" IS NULL OR "creationDiscountCents" >= 0));
