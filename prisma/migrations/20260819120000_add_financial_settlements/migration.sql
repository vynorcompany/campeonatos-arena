CREATE TABLE "FinancialSettlement" (
    "id" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arenaId" TEXT NOT NULL,
    "financialEntryId" TEXT NOT NULL,
    "saleId" TEXT,

    CONSTRAINT "FinancialSettlement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancialSettlement_arenaId_paidAt_idx" ON "FinancialSettlement"("arenaId", "paidAt");
CREATE INDEX "FinancialSettlement_financialEntryId_paidAt_idx" ON "FinancialSettlement"("financialEntryId", "paidAt");
CREATE INDEX "FinancialSettlement_saleId_idx" ON "FinancialSettlement"("saleId");

ALTER TABLE "FinancialSettlement"
  ADD CONSTRAINT "FinancialSettlement_arenaId_fkey"
  FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinancialSettlement"
  ADD CONSTRAINT "FinancialSettlement_financialEntryId_fkey"
  FOREIGN KEY ("financialEntryId") REFERENCES "FinancialEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinancialSettlement"
  ADD CONSTRAINT "FinancialSettlement_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
