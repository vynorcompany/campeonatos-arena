ALTER TABLE "Product" ADD COLUMN "isService" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "showOnAgenda" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "showOnComandas" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Comanda" ADD COLUMN "openedByUserId" TEXT,
  ADD COLUMN "openedByUserName" TEXT NOT NULL DEFAULT '';
-- Backfill only authors actually recorded at creation; never infer ownership.
UPDATE "Comanda" c SET "openedByUserId" = e."actorId", "openedByUserName" = e."actorName"
FROM "AuditEvent" e WHERE e.action = 'DB:CREATE:Comanda' AND e."entityId" = c.id
  AND e."actorId" NOT IN ('SYSTEM', 'ANONYMOUS', 'SYSTEM:JOBS');
