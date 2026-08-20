ALTER TABLE "FinancialEntry"
  ADD COLUMN "counterpartyName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "voidReason" TEXT NOT NULL DEFAULT '';

ALTER TABLE "FinancialSettlement"
  ADD COLUMN "interestCents" INTEGER NOT NULL DEFAULT 0;
