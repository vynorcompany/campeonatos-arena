ALTER TABLE "PortalEventPost"
ADD COLUMN "linkUrl" TEXT;

CREATE INDEX "FinancialEntry_arenaId_type_status_counterpartyName_idx"
ON "FinancialEntry"("arenaId", "type", "status", "counterpartyName");
