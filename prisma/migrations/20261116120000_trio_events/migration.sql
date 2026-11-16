ALTER TYPE "CompetitionFormat" ADD VALUE IF NOT EXISTS 'TRIO';
CREATE UNIQUE INDEX "CategoryMatch_id_competitionId_key" ON "CategoryMatch" ("id", "competitionId");
CREATE TABLE "CategoryTrioGame" (
  "id" TEXT PRIMARY KEY,
  "matchId" TEXT NOT NULL,
  "competitionId" TEXT NOT NULL,
  "gameNumber" INTEGER NOT NULL CHECK ("gameNumber" BETWEEN 1 AND 3),
  "homePlayerIds" TEXT[] NOT NULL,
  "awayPlayerIds" TEXT[] NOT NULL,
  "homeScore" INTEGER NOT NULL CHECK ("homeScore" BETWEEN 0 AND 99),
  "awayScore" INTEGER NOT NULL CHECK ("awayScore" BETWEEN 0 AND 99),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CategoryTrioGame_matchId_competitionId_fkey" FOREIGN KEY ("matchId", "competitionId") REFERENCES "CategoryMatch" ("id", "competitionId") ON DELETE CASCADE ON UPDATE CASCADE,
  CHECK ("homeScore" <> "awayScore"),
  CHECK (cardinality("homePlayerIds") = 2 AND array_ndims("homePlayerIds") = 1 AND array_position("homePlayerIds", NULL) IS NULL AND "homePlayerIds"[1] <> "homePlayerIds"[2]),
  CHECK (cardinality("awayPlayerIds") = 2 AND array_ndims("awayPlayerIds") = 1 AND array_position("awayPlayerIds", NULL) IS NULL AND "awayPlayerIds"[1] <> "awayPlayerIds"[2])
);
CREATE UNIQUE INDEX "CategoryTrioGame_matchId_gameNumber_key" ON "CategoryTrioGame" ("matchId", "gameNumber");
CREATE INDEX "CategoryTrioGame_competitionId_idx" ON "CategoryTrioGame" ("competitionId");
ALTER TABLE "CategoryTrioGame" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CategoryTrioGame" FORCE ROW LEVEL SECURITY;
CREATE POLICY arena_scope_trio_game ON "CategoryTrioGame"
USING (EXISTS (SELECT 1 FROM "CategoryCompetition" c JOIN "TournamentCategory" tc ON tc.id=c."categoryId" JOIN "Tournament" t ON t.id=tc."tournamentId" WHERE c.id="CategoryTrioGame"."competitionId" AND t."arenaId"=public.current_arena_id()))
WITH CHECK (EXISTS (SELECT 1 FROM "CategoryCompetition" c JOIN "TournamentCategory" tc ON tc.id=c."categoryId" JOIN "Tournament" t ON t.id=tc."tournamentId" WHERE c.id="CategoryTrioGame"."competitionId" AND t."arenaId"=public.current_arena_id()));
GRANT SELECT, INSERT, UPDATE, DELETE ON "CategoryTrioGame" TO arena_runtime;

CREATE FUNCTION public.guard_trio_game() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE m record; first_game record; second_game record;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW."matchId",0));
  SELECT cm.*, c.format::text AS format, c.status AS competition_status INTO m FROM "CategoryMatch" cm JOIN "CategoryCompetition" c ON c.id=cm."competitionId" WHERE cm.id=NEW."matchId" AND cm."competitionId"=NEW."competitionId";
  IF m.id IS NULL OR m.format <> 'TRIO' OR m.competition_status <> 'PUBLISHED' OR m."homePairId" IS NULL OR m."awayPairId" IS NULL THEN RAISE EXCEPTION 'Invalid published Trio encounter'; END IF;
  NEW."homePlayerIds" := ARRAY(SELECT x FROM unnest(NEW."homePlayerIds") x ORDER BY x);
  NEW."awayPlayerIds" := ARRAY(SELECT x FROM unnest(NEW."awayPlayerIds") x ORDER BY x);
  IF (SELECT count(*) FROM "CategoryPairPlayer" WHERE "pairId"=m."homePairId" AND "competitionId"=NEW."competitionId") <> 3 OR
     (SELECT count(*) FROM "CategoryPairPlayer" WHERE "pairId"=m."awayPairId" AND "competitionId"=NEW."competitionId") <> 3 OR
     (SELECT count(*) FROM "CategoryPairPlayer" WHERE "pairId"=m."homePairId" AND "competitionId"=NEW."competitionId" AND "playerId"=ANY(NEW."homePlayerIds")) <> 2 OR
     (SELECT count(*) FROM "CategoryPairPlayer" WHERE "pairId"=m."awayPairId" AND "competitionId"=NEW."competitionId" AND "playerId"=ANY(NEW."awayPlayerIds")) <> 2 THEN RAISE EXCEPTION 'Trio lineup must use two different members of each three-athlete team'; END IF;
  IF EXISTS (SELECT 1 FROM "CategoryTrioGame" WHERE "matchId"=NEW."matchId" AND "gameNumber"<>NEW."gameNumber" AND ("homePlayerIds"=NEW."homePlayerIds" OR "awayPlayerIds"=NEW."awayPlayerIds")) THEN RAISE EXCEPTION 'Trio formation already used in this encounter'; END IF;
  SELECT * INTO first_game FROM "CategoryTrioGame" WHERE "matchId"=NEW."matchId" AND "gameNumber"=1;
  SELECT * INTO second_game FROM "CategoryTrioGame" WHERE "matchId"=NEW."matchId" AND "gameNumber"=2;
  IF NEW."gameNumber"=1 THEN first_game:=NEW; END IF;
  IF NEW."gameNumber"=2 THEN second_game:=NEW; END IF;
  IF NEW."gameNumber">1 AND first_game.id IS NULL THEN RAISE EXCEPTION 'Record the first Trio game before the return game'; END IF;
  IF NEW."gameNumber"=3 OR EXISTS(SELECT 1 FROM "CategoryTrioGame" WHERE "matchId"=NEW."matchId" AND "gameNumber"=3) THEN
    IF first_game.id IS NULL OR second_game.id IS NULL OR (first_game."homeScore">first_game."awayScore")=(second_game."homeScore">second_game."awayScore") THEN RAISE EXCEPTION 'The third Trio game requires a 1-1 tie'; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_trio_game() FROM PUBLIC;
CREATE TRIGGER trio_game_guard BEFORE INSERT OR UPDATE ON "CategoryTrioGame" FOR EACH ROW EXECUTE FUNCTION public.guard_trio_game();

ALTER TABLE "PublicTournamentRegistration" ADD COLUMN "thirdName" TEXT NOT NULL DEFAULT '', ADD COLUMN "thirdPhone" TEXT NOT NULL DEFAULT '', ADD COLUMN "thirdCpf" TEXT NOT NULL DEFAULT '', ADD COLUMN "thirdBirthDate" TIMESTAMP(3);
