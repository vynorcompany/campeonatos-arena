ALTER TABLE "FiscalDocument"
  ADD COLUMN "financialEntryId" TEXT,
  ADD COLUMN "saleId" TEXT;

CREATE UNIQUE INDEX "FiscalDocument_financialEntryId_key" ON "FiscalDocument"("financialEntryId");
CREATE UNIQUE INDEX "FiscalDocument_saleId_key" ON "FiscalDocument"("saleId");

ALTER TABLE "FiscalDocument"
  ADD CONSTRAINT "FiscalDocument_financialEntryId_fkey"
  FOREIGN KEY ("financialEntryId") REFERENCES "FinancialEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FiscalDocument"
  ADD CONSTRAINT "FiscalDocument_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
