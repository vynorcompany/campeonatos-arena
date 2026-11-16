CREATE FUNCTION public.guard_trio_lineup_history() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "CategoryPair" p WHERE p.id=OLD."pairId") AND EXISTS (
    SELECT 1 FROM "CategoryTrioGame" g JOIN "CategoryMatch" m ON m.id=g."matchId"
    WHERE (m."homePairId"=OLD."pairId" AND OLD."playerId"=ANY(g."homePlayerIds")) OR (m."awayPairId"=OLD."pairId" AND OLD."playerId"=ANY(g."awayPlayerIds"))
  ) THEN RAISE EXCEPTION 'A played Trio lineup cannot lose or replace an athlete'; END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
REVOKE ALL ON FUNCTION public.guard_trio_lineup_history() FROM PUBLIC;
CREATE TRIGGER trio_lineup_history_guard BEFORE DELETE OR UPDATE OF "pairId", "playerId", "competitionId" ON "CategoryPairPlayer" FOR EACH ROW EXECUTE FUNCTION public.guard_trio_lineup_history();

CREATE FUNCTION public.guard_trio_encounter() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE mode text; played integer; home_wins integer; away_wins integer; expected_winner text;
BEGIN
 SELECT format::text INTO mode FROM "CategoryCompetition" WHERE id=NEW."competitionId";
 IF mode<>'TRIO' THEN RETURN NEW; END IF;
 SELECT count(*),count(*) FILTER(WHERE "homeScore">"awayScore"),count(*) FILTER(WHERE "awayScore">"homeScore") INTO played,home_wins,away_wins FROM "CategoryTrioGame" WHERE "matchId"=NEW.id;
 IF played>0 AND (OLD."homePairId" IS DISTINCT FROM NEW."homePairId" OR OLD."awayPairId" IS DISTINCT FROM NEW."awayPairId" OR OLD."competitionId" IS DISTINCT FROM NEW."competitionId") THEN RAISE EXCEPTION 'Teams cannot change after a Trio game was played'; END IF;
 expected_winner:=CASE WHEN home_wins=2 THEN NEW."homePairId" WHEN away_wins=2 THEN NEW."awayPairId" ELSE NULL END;
 IF NEW."winnerPairId" IS DISTINCT FROM expected_winner OR (played>0 AND (NEW."homeScore" IS DISTINCT FROM home_wins OR NEW."awayScore" IS DISTINCT FROM away_wins)) OR (played=0 AND (coalesce(NEW."homeScore",0)<>0 OR coalesce(NEW."awayScore",0)<>0)) OR (NEW."manualStatus"='FINISHED' AND expected_winner IS NULL) THEN RAISE EXCEPTION 'The Trio encounter result must match its individual games'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_trio_encounter() FROM PUBLIC;
CREATE TRIGGER trio_encounter_guard BEFORE UPDATE ON "CategoryMatch" FOR EACH ROW EXECUTE FUNCTION public.guard_trio_encounter();
