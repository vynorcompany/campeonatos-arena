-- A conta é fixada antes de emitir a cobrança, sem reclassificar reservas antigas.
ALTER TABLE "ScheduleOccurrence" ADD COLUMN "paymentBankAccountId" TEXT;
ALTER TABLE "ScheduleOccurrence" ADD CONSTRAINT "ScheduleOccurrence_arenaId_paymentBankAccountId_fkey"
  FOREIGN KEY ("arenaId", "paymentBankAccountId") REFERENCES "BankAccount"("arenaId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX "ScheduleOccurrence_arenaId_paymentBankAccountId_idx" ON "ScheduleOccurrence"("arenaId", "paymentBankAccountId");
