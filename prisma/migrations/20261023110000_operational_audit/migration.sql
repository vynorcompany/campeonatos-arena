CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "arenaId" TEXT NOT NULL REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "details" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditEvent_arenaId_createdAt_idx" ON "AuditEvent"("arenaId", "createdAt");
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON "AuditEvent" TO arena_runtime;
CREATE POLICY "audit_read" ON "AuditEvent" FOR SELECT USING ("arenaId" = (SELECT public.current_arena_id()));
CREATE POLICY "audit_insert" ON "AuditEvent" FOR INSERT WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));
