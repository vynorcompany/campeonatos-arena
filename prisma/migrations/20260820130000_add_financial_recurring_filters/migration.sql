ALTER TABLE "FinancialEntry"
  ADD COLUMN "supplierId" TEXT,
  ADD COLUMN "bankAccountId" TEXT,
  ADD COLUMN "planId" TEXT,
  ADD COLUMN "recurrenceId" TEXT,
  ADD COLUMN "productId" TEXT;

CREATE TABLE "FinancialRecurrence" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "counterpartyName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "frequency" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "nextDueDate" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  "supplierId" TEXT,
  "bankAccountId" TEXT,
  "planId" TEXT,
  CONSTRAINT "FinancialRecurrence_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FinancialRecurrence_arenaId_active_nextDueDate_idx" ON "FinancialRecurrence"("arenaId", "active", "nextDueDate");
CREATE INDEX "FinancialEntry_supplierId_idx" ON "FinancialEntry"("supplierId");
CREATE INDEX "FinancialEntry_bankAccountId_idx" ON "FinancialEntry"("bankAccountId");
CREATE INDEX "FinancialEntry_planId_idx" ON "FinancialEntry"("planId");
CREATE INDEX "FinancialEntry_recurrenceId_idx" ON "FinancialEntry"("recurrenceId");
CREATE INDEX "FinancialEntry_productId_idx" ON "FinancialEntry"("productId");
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "FinancialRecurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialRecurrence" ADD CONSTRAINT "FinancialRecurrence_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialRecurrence" ADD CONSTRAINT "FinancialRecurrence_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialRecurrence" ADD CONSTRAINT "FinancialRecurrence_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialRecurrence" ADD CONSTRAINT "FinancialRecurrence_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
