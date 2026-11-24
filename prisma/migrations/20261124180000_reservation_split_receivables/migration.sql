ALTER TABLE "FinancialEntry" ADD COLUMN "reservationSplitParentId" TEXT;
CREATE UNIQUE INDEX "FinancialEntry_arenaId_id_key" ON "FinancialEntry"("arenaId", "id");
CREATE INDEX "FinancialEntry_arenaId_reservationSplitParentId_idx" ON "FinancialEntry"("arenaId", "reservationSplitParentId");
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_reservationSplitParent_not_self" CHECK ("reservationSplitParentId" IS DISTINCT FROM "id");
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_arenaId_reservationSplitParentId_fkey" FOREIGN KEY ("arenaId", "reservationSplitParentId") REFERENCES "FinancialEntry"("arenaId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;
