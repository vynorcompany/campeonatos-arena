CREATE UNIQUE INDEX "BankAccount_arenaId_id_key" ON "BankAccount"("arenaId", "id");
ALTER TABLE "ArenaOperationalSettings" ADD COLUMN "portalPaymentBankAccountId" TEXT;
ALTER TABLE "OnlinePaymentCheckout" ADD COLUMN "bankAccountId" TEXT;
ALTER TABLE "ArenaOperationalSettings" ADD CONSTRAINT "ArenaOperationalSettings_portalPaymentBankAccount_fkey" FOREIGN KEY ("arenaId", "portalPaymentBankAccountId") REFERENCES "BankAccount"("arenaId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "OnlinePaymentCheckout" ADD CONSTRAINT "OnlinePaymentCheckout_bankAccount_fkey" FOREIGN KEY ("arenaId", "bankAccountId") REFERENCES "BankAccount"("arenaId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;
