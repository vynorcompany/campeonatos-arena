-- RLS must not mistake invisible memberships for an orphan identity.
CREATE FUNCTION public.delete_orphan_athlete_identity(p_identity_id text) RETURNS boolean
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 DELETE FROM public."AthleteIdentity" i WHERE i.id=p_identity_id
  AND NOT EXISTS(SELECT 1 FROM public."PlayerAccount" a WHERE a."identityId"=i.id);
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.delete_orphan_athlete_identity(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_orphan_athlete_identity(text) TO arena_runtime;
