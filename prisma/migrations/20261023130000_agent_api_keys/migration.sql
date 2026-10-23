CREATE TABLE "AgentApiKey" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "arenaId" TEXT NOT NULL REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "scopes" TEXT[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "AgentApiKey_tokenHash_key" ON "AgentApiKey"("tokenHash");
CREATE INDEX "AgentApiKey_arenaId_createdAt_idx" ON "AgentApiKey"("arenaId", "createdAt");
ALTER TABLE "AgentApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentApiKey" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON "AgentApiKey" TO arena_runtime;
CREATE POLICY "agent_key_read" ON "AgentApiKey" FOR SELECT USING ("arenaId" = (SELECT public.current_arena_id()));
CREATE POLICY "agent_key_insert" ON "AgentApiKey" FOR INSERT WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));
CREATE POLICY "agent_key_update" ON "AgentApiKey" FOR UPDATE USING ("arenaId" = (SELECT public.current_arena_id())) WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));
-- Resolve an opaque credential before its tenant context is known. Never return hashes.
CREATE FUNCTION public.authenticate_agent_key(digest TEXT)
RETURNS TABLE (id TEXT, "arenaId" TEXT, scopes TEXT[]) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT k.id, k."arenaId", k.scopes FROM public."AgentApiKey" k
  WHERE k."tokenHash" = digest AND k."revokedAt" IS NULL AND k."expiresAt" > CURRENT_TIMESTAMP
$$;
REVOKE ALL ON FUNCTION public.authenticate_agent_key(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authenticate_agent_key(TEXT) TO arena_runtime;
