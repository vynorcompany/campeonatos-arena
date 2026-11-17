ALTER TABLE "Tournament" ADD COLUMN "onlinePaymentEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PublicTournamentRegistration" ADD COLUMN "leadPlayerId" TEXT;
ALTER TABLE "PublicTournamentRegistration" ADD CONSTRAINT "PublicTournamentRegistration_leadPlayerId_fkey" FOREIGN KEY ("leadPlayerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "PublicTournamentRegistration_leadPlayerId_idx" ON "PublicTournamentRegistration"("leadPlayerId");

-- Existing registrations remain untouched. The association must belong to the same arena.
CREATE FUNCTION public.guard_registration_lead_player() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."leadPlayerId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "Player" p JOIN "Tournament" t ON t.id=NEW."tournamentId"
    WHERE p.id=NEW."leadPlayerId" AND p."arenaId"=t."arenaId" AND p."mergedIntoPlayerId" IS NULL
  ) THEN RAISE EXCEPTION 'O cliente da inscrição deve pertencer à mesma arena.'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "registration_lead_player_arena" BEFORE INSERT OR UPDATE OF "leadPlayerId", "tournamentId" ON "PublicTournamentRegistration" FOR EACH ROW EXECUTE FUNCTION public.guard_registration_lead_player();

CREATE OR REPLACE FUNCTION public.guard_individual_event_registration() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE category_type TEXT;
BEGIN
  SELECT "registrationType" INTO category_type FROM "TournamentCategory" WHERE id=NEW."categoryId" FOR UPDATE;
  IF category_type='INDIVIDUAL' THEN
    IF NEW."partnerName"<>'' OR NEW."partnerPhone"<>'' OR NEW."partnerCpf"<>'' OR NEW."thirdName"<>'' OR NEW."thirdPhone"<>'' OR NEW."thirdCpf"<>'' OR NEW."competitionId" IS NOT NULL THEN
      RAISE EXCEPTION 'Esta categoria aceita somente um participante por inscrição, sem competição.';
    END IF;
    IF NEW.status<>'CANCELED' AND EXISTS (
      SELECT 1 FROM "PublicTournamentRegistration" r
      WHERE r."categoryId"=NEW."categoryId" AND r.id<>NEW.id AND r.status<>'CANCELED'
      AND ((NEW."leadPlayerId" IS NOT NULL AND r."leadPlayerId"=NEW."leadPlayerId")
        OR (NEW."leadCpf"<>'' AND r."leadCpf"=NEW."leadCpf")
        OR (NEW."leadPhone"<>'' AND regexp_replace(r."leadPhone", '[^0-9]', '', 'g')=regexp_replace(NEW."leadPhone", '[^0-9]', '', 'g') AND lower(trim(r."leadName"))=lower(trim(NEW."leadName"))))
    ) THEN RAISE EXCEPTION 'Este participante já está inscrito nesta categoria.'; END IF;
  END IF;
  RETURN NEW;
END $$;
