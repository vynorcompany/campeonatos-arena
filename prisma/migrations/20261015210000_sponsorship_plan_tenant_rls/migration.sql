ALTER TABLE "SponsorshipPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SponsorshipPlan" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_SponsorshipPlan" ON "SponsorshipPlan"
  USING ("arenaId" = (SELECT public.current_arena_id()))
  WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));
