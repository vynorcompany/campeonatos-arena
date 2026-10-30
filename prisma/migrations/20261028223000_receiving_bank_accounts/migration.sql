ALTER TABLE "FinancialSettlement" ADD COLUMN "bankAccountId" TEXT;
ALTER TABLE "SalePayment" ADD COLUMN "bankAccountId" TEXT;
ALTER TABLE "FinancialSettlement" ADD CONSTRAINT "FinancialSettlement_arenaId_bankAccountId_fkey" FOREIGN KEY ("arenaId", "bankAccountId") REFERENCES "BankAccount"("arenaId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
UPDATE "FinancialSettlement" s SET "bankAccountId" = e."bankAccountId" FROM "FinancialEntry" e JOIN "BankAccount" b ON b.id = e."bankAccountId" AND b."arenaId" = e."arenaId" WHERE s."financialEntryId" = e.id AND s."arenaId" = e."arenaId";
