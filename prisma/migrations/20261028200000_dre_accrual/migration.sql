ALTER TABLE "FinancialEntry" ADD COLUMN "competenceDate" TIMESTAMP(3);
CREATE INDEX "FinancialEntry_arenaId_competenceDate_idx" ON "FinancialEntry"("arenaId", "competenceDate");
ALTER TABLE "FinancialCategory" ADD COLUMN "dreGroup" TEXT NOT NULL DEFAULT 'AUTO';
