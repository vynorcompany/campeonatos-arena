DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='arena_agency') THEN CREATE ROLE arena_agency LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS; END IF; END $$;
GRANT USAGE ON SCHEMA public TO arena_agency;
GRANT SELECT,INSERT,UPDATE,DELETE ON "AgencyInvoice","AgencySubscription","AgencyPlan","AgencyPaymentConnection","SupportTicket","SupportTicketMessage","Arena","User","ArenaMember","PermissionProfile" TO arena_agency;
GRANT SELECT,INSERT,UPDATE ON "FinancialEntry" TO arena_agency;
GRANT SELECT (id,"arenaId") ON "Player","Student" TO arena_agency;
CREATE POLICY agency_player_counts ON "Player" FOR SELECT TO arena_agency USING (true);
CREATE POLICY agency_student_counts ON "Student" FOR SELECT TO arena_agency USING (true);
CREATE POLICY agency_membership_management ON "ArenaMember" TO arena_agency USING (true) WITH CHECK (true);
CREATE POLICY agency_profile_management ON "PermissionProfile" TO arena_agency USING (true) WITH CHECK (true);
DO $policies$
DECLARE name text;
BEGIN
 FOREACH name IN ARRAY ARRAY['AgencyInvoice','AgencySubscription','SupportTicket','RegulationAcceptance'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',name);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',name);
  EXECUTE format('CREATE POLICY tenant_private_scope ON public.%I TO arena_runtime USING ("arenaId"=public.current_arena_id()) WITH CHECK ("arenaId"=public.current_arena_id())',name);
  EXECUTE format('CREATE POLICY agency_service_scope ON public.%I TO arena_agency USING (true) WITH CHECK (true)',name);
 END LOOP;
END $policies$;
CREATE POLICY identity_subscription_status ON "AgencySubscription" FOR SELECT TO arena_auth USING (true);
ALTER TABLE "SupportTicketMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicketMessage" FORCE ROW LEVEL SECURITY;
CREATE POLICY ticket_message_scope ON "SupportTicketMessage" TO arena_runtime
 USING (EXISTS(SELECT 1 FROM "SupportTicket" t WHERE t.id="ticketId" AND t."arenaId"=public.current_arena_id()))
 WITH CHECK (EXISTS(SELECT 1 FROM "SupportTicket" t WHERE t.id="ticketId" AND t."arenaId"=public.current_arena_id()));
CREATE POLICY agency_ticket_messages ON "SupportTicketMessage" TO arena_agency USING (true) WITH CHECK (true);
REVOKE DELETE ON "Arena" FROM arena_agency;
