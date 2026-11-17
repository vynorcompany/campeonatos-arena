-- Additive: existing categories and all scores remain unchanged.
ALTER TABLE "TournamentCategory" ADD COLUMN "registrationType" TEXT NOT NULL DEFAULT 'PAIR';
ALTER TABLE "TournamentCategory" ADD CONSTRAINT "TournamentCategory_registrationType_check" CHECK ("registrationType" IN ('PAIR', 'INDIVIDUAL'));

CREATE FUNCTION public.guard_event_registration_type() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."registrationType" IS DISTINCT FROM OLD."registrationType" AND (
    EXISTS (SELECT 1 FROM "PublicTournamentRegistration" WHERE "categoryId"=OLD.id) OR
    EXISTS (SELECT 1 FROM "CategoryCompetition" WHERE "categoryId"=OLD.id) OR
    EXISTS (SELECT 1 FROM "CategoryBracket" WHERE "categoryId"=OLD.id)
  ) THEN
    RAISE EXCEPTION 'Esta categoria já possui inscrições ou competição. Crie outra categoria para alterar o tipo de inscrição.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "event_registration_type_history" BEFORE UPDATE OF "registrationType" ON "TournamentCategory" FOR EACH ROW EXECUTE FUNCTION public.guard_event_registration_type();

CREATE FUNCTION public.guard_individual_event_competition() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE category_type TEXT;
BEGIN
  SELECT "registrationType" INTO category_type FROM "TournamentCategory" WHERE id=NEW."categoryId" FOR UPDATE;
  IF category_type='INDIVIDUAL' THEN
    RAISE EXCEPTION 'Categorias de inscrição individual não possuem jogos.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "individual_event_no_competition" BEFORE INSERT OR UPDATE OF "categoryId" ON "CategoryCompetition" FOR EACH ROW EXECUTE FUNCTION public.guard_individual_event_competition();
CREATE TRIGGER "individual_event_no_bracket" BEFORE INSERT OR UPDATE OF "categoryId" ON "CategoryBracket" FOR EACH ROW EXECUTE FUNCTION public.guard_individual_event_competition();

CREATE FUNCTION public.guard_individual_event_registration() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE category_type TEXT;
BEGIN
  SELECT "registrationType" INTO category_type FROM "TournamentCategory" WHERE id=NEW."categoryId" FOR UPDATE;
  IF category_type='INDIVIDUAL' THEN
    IF NEW."partnerName"<>'' OR NEW."partnerPhone"<>'' OR NEW."partnerCpf"<>'' OR NEW."thirdName"<>'' OR NEW."thirdPhone"<>'' OR NEW."thirdCpf"<>'' OR NEW."competitionId" IS NOT NULL THEN
      RAISE EXCEPTION 'Esta categoria aceita somente um participante por inscrição, sem competição.';
    END IF;
    IF NEW.status<>'CANCELED' AND EXISTS (SELECT 1 FROM "PublicTournamentRegistration" WHERE "categoryId"=NEW."categoryId" AND "leadCpf"=NEW."leadCpf" AND id<>NEW.id AND status<>'CANCELED') THEN
      RAISE EXCEPTION 'Este participante já está inscrito nesta categoria.';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "individual_event_one_participant" BEFORE INSERT OR UPDATE ON "PublicTournamentRegistration" FOR EACH ROW EXECUTE FUNCTION public.guard_individual_event_registration();
