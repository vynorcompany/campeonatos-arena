ALTER TABLE "ArenaNotification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArenaNotification" FORCE ROW LEVEL SECURITY;

CREATE POLICY "arena_scope_arena_notification" ON "ArenaNotification"
  USING ("arenaId" = (SELECT public.current_arena_id()))
  WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON "ArenaNotification" TO arena_runtime;
