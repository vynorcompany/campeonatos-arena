-- Preserve a conta escolhida pela arena antes de emitir a cobrança.
-- Inscrições antigas permanecem sem atribuição, para conciliação explícita.
ALTER TABLE "PublicTournamentRegistration" ADD COLUMN "paymentBankAccountId" TEXT;
ALTER TABLE "PublicTournamentRegistration" ADD CONSTRAINT "PublicTournamentRegistration_paymentBankAccountId_fkey"
  FOREIGN KEY ("paymentBankAccountId") REFERENCES "BankAccount"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX "PublicTournamentRegistration_paymentBankAccountId_idx" ON "PublicTournamentRegistration"("paymentBankAccountId");
