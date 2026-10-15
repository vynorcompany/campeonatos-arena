ALTER TABLE "ManualUpcomingMatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ManualUpcomingMatch" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_ManualUpcomingMatch" ON "ManualUpcomingMatch"
  USING ("arenaId" = (SELECT public.current_arena_id()))
  WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));

ALTER TABLE "TvPresentationSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TvPresentationSettings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_TvPresentationSettings" ON "TvPresentationSettings"
  USING ("arenaId" = (SELECT public.current_arena_id()))
  WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));

ALTER TABLE "TvSponsor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TvSponsor" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_TvSponsor" ON "TvSponsor"
  USING ("arenaId" = (SELECT public.current_arena_id()))
  WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));
