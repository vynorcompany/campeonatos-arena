-- Logical removal keeps registration, financial and result history intact.
ALTER TABLE "TournamentCategory" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "TournamentCategory" ADD CONSTRAINT "TournamentCategory_archived_inactive" CHECK ("archivedAt" IS NULL OR NOT active);
CREATE FUNCTION public.guard_archived_event_registration() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE archived_at TIMESTAMP;
BEGIN
  SELECT "archivedAt" INTO archived_at FROM "TournamentCategory" WHERE id=NEW."categoryId" FOR UPDATE;
  IF archived_at IS NOT NULL AND (TG_OP='INSERT' OR NEW."categoryId" IS DISTINCT FROM OLD."categoryId") THEN
    RAISE EXCEPTION 'Esta categoria foi removida e não aceita novas inscrições.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "archived_event_no_new_registration" BEFORE INSERT OR UPDATE OF "categoryId" ON "PublicTournamentRegistration" FOR EACH ROW EXECUTE FUNCTION public.guard_archived_event_registration();
CREATE FUNCTION public.guard_archived_event_competition() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE archived_at TIMESTAMP;
BEGIN
  SELECT "archivedAt" INTO archived_at FROM "TournamentCategory" WHERE id=NEW."categoryId" FOR UPDATE;
  IF archived_at IS NOT NULL THEN RAISE EXCEPTION 'Esta categoria foi removida.'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "archived_event_no_new_competition" BEFORE INSERT OR UPDATE OF "categoryId" ON "CategoryCompetition" FOR EACH ROW EXECUTE FUNCTION public.guard_archived_event_competition();
CREATE TRIGGER "archived_event_no_new_bracket" BEFORE INSERT OR UPDATE OF "categoryId" ON "CategoryBracket" FOR EACH ROW EXECUTE FUNCTION public.guard_archived_event_competition();
