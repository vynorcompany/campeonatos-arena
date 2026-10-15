ALTER TABLE "StudentSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentSubscription" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_hardened_StudentSubscription" ON "StudentSubscription"
  USING ("arenaId" = public.current_arena_id())
  WITH CHECK ("arenaId" = public.current_arena_id());

CREATE INDEX "StudentSubscription_arenaId_createdAt_id_idx"
  ON "StudentSubscription"("arenaId", "createdAt", "id");
