CREATE TABLE "PrivacyRequest" (
  "id" TEXT PRIMARY KEY,
  "arenaId" TEXT NOT NULL REFERENCES "Arena"("id") ON DELETE CASCADE,
  "playerId" TEXT NOT NULL REFERENCES "Player"("id") ON DELETE RESTRICT,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('ERASURE', 'CORRECTION', 'ACCESS', 'OTHER')),
  "status" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN', 'COMPLETED')),
  "message" TEXT NOT NULL DEFAULT '',
  "response" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3)
);
CREATE INDEX "PrivacyRequest_arenaId_status_createdAt_idx" ON "PrivacyRequest" ("arenaId", "status", "createdAt");
CREATE INDEX "PrivacyRequest_playerId_createdAt_idx" ON "PrivacyRequest" ("playerId", "createdAt");
ALTER TABLE "PrivacyRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrivacyRequest" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_privacy_request" ON "PrivacyRequest"
USING ("arenaId" = public.current_arena_id())
WITH CHECK ("arenaId" = public.current_arena_id() AND EXISTS (
  SELECT 1 FROM "Player" p WHERE p.id = "playerId" AND p."arenaId" = public.current_arena_id()
));
