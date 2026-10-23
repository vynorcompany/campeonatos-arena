-- Requests without an arena (login, agency and authentication failures) are
-- retained separately; they must never be exposed to another arena.
ALTER TABLE "AuditEvent" DROP CONSTRAINT "AuditEvent_arenaId_fkey";
ALTER TABLE "AuditEvent" ALTER COLUMN "arenaId" DROP NOT NULL;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_arenaId_fkey"
  FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");
CREATE POLICY "audit_request_read" ON "AuditEvent" FOR SELECT
  USING ("id" = nullif(current_setting('app.audit_request_id', true), ''));
CREATE POLICY "audit_request_insert" ON "AuditEvent" FOR INSERT
  WITH CHECK ("id" = nullif(current_setting('app.audit_request_id', true), ''));
CREATE POLICY "audit_request_update" ON "AuditEvent" FOR UPDATE
  USING ("id" = nullif(current_setting('app.audit_request_id', true), ''))
  WITH CHECK ("id" = nullif(current_setting('app.audit_request_id', true), ''));
CREATE POLICY "audit_agency_read" ON "AuditEvent" FOR SELECT
  USING ("arenaId" IS NULL AND current_setting('app.audit_agency', true) = 'true');
GRANT UPDATE ("arenaId", "actorId", "actorName", "details") ON "AuditEvent" TO arena_runtime;
