CREATE INDEX "Sale_arenaId_status_createdAt_idx" ON "Sale"("arenaId", "status", "createdAt");
CREATE INDEX "Comanda_arenaId_status_openedAt_idx" ON "Comanda"("arenaId", "status", "openedAt");
CREATE INDEX "FinancialEntry_arenaId_status_dueDate_idx" ON "FinancialEntry"("arenaId", "status", "dueDate");
