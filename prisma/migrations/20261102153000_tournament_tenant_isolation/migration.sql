ALTER TABLE "Tournament" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tournament" FORCE ROW LEVEL SECURITY;
CREATE POLICY tournament_private_scope ON "Tournament"
 USING ("arenaId"=public.current_arena_id()) WITH CHECK ("arenaId"=public.current_arena_id());
-- Public routes resolve only the supplied public slug, then enter that arena's scope.
CREATE FUNCTION public.resolve_tournament_public_slug(p_slug text)
 RETURNS TABLE(id text,"arenaId" text) LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path=pg_catalog,public AS $$
 SELECT id,"arenaId" FROM public."Tournament" WHERE "publicSlug"=p_slug LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.resolve_tournament_public_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_tournament_public_slug(text) TO arena_runtime;
-- Public event discovery returns only the explicitly published radar projection.
CREATE FUNCTION public.public_event_radar() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path=pg_catalog,public AS $$
 SELECT coalesce(jsonb_agg(event),'[]'::jsonb) FROM (
 SELECT t.id,t.name,t.description,t."publicSlug",t."registrationPhase",t."creationMode",
 jsonb_build_object('name',a.name,'logoUrl',a."logoUrl",'city',a.city,'state',a.state) AS arena,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'gender',c.gender) ORDER BY c.level),'[]'::jsonb) FROM public."TournamentCategory" c WHERE c."tournamentId"=t.id AND c.active) AS categories
 FROM public."Tournament" t JOIN public."Arena" a ON a.id=t."arenaId"
 WHERE t."showInEventRadar" AND t."registrationPhase" IN ('REGISTRATIONS','LIVE') AND a."archivedAt" IS NULL
 ORDER BY t."registrationPhase",t."updatedAt" DESC LIMIT 80
 ) event
$$;
REVOKE ALL ON FUNCTION public.public_event_radar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_event_radar() TO arena_runtime;
