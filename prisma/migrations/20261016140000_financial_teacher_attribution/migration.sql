-- Keep the teacher who owns a charge even when a plan template is shared.
-- Existing rows stay unattributed; historical assignments must not be guessed.
ALTER TABLE "FinancialEntry" ADD COLUMN "teacherId" TEXT;
ALTER TABLE "FinancialRecurrence" ADD COLUMN "teacherId" TEXT;

CREATE INDEX "FinancialEntry_arenaId_teacherId_idx" ON "FinancialEntry"("arenaId", "teacherId");
CREATE INDEX "FinancialRecurrence_arenaId_teacherId_idx" ON "FinancialRecurrence"("arenaId", "teacherId");
