DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='arena_auth') THEN CREATE ROLE arena_auth LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO arena_auth;
GRANT SELECT,INSERT,UPDATE,DELETE ON "User","Session","LoginAttempt","PlayerAccount","PlayerSession","AthleteIdentity","PlayerAuthAttempt","PlayerVerificationCode","AccountActionToken","ArenaMember" TO arena_auth;
GRANT SELECT ON "PermissionProfile" TO arena_auth;
GRANT SELECT (id,name,"logoUrl",slug,"accountStatus") ON "Arena" TO arena_auth;
GRANT SELECT (id,"arenaId",status,"trialEndsAt","planId") ON "AgencySubscription" TO arena_auth;
GRANT SELECT (id,"isTrial") ON "AgencyPlan" TO arena_auth;
DO $policies$
DECLARE name text;
BEGIN
 FOREACH name IN ARRAY ARRAY['PermissionProfile','ArenaMember','PlayerAccount','PlayerAuthAttempt','PlayerVerificationCode','AccountActionToken'] LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',name);
   EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',name);
   EXECUTE format('CREATE POLICY tenant_private_scope ON public.%I TO arena_runtime USING ("arenaId"=public.current_arena_id()) WITH CHECK ("arenaId"=public.current_arena_id())',name);
   EXECUTE format('CREATE POLICY identity_service_scope ON public.%I TO arena_auth USING (true) WITH CHECK (true)',name);
 END LOOP;
END $policies$;
