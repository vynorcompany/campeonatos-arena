ALTER TABLE "RankingProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RankingProfile" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_ranking_profile" ON "RankingProfile"
USING ("arenaId" = public.current_arena_id()) WITH CHECK ("arenaId" = public.current_arena_id());

DO $$ DECLARE child TEXT; BEGIN
  FOREACH child IN ARRAY ARRAY['RankingRule', 'RankingCycle'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', child);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', child);
    EXECUTE format('CREATE POLICY arena_scope_ranking_parent ON %I
      USING (EXISTS (SELECT 1 FROM "RankingProfile" r WHERE r.id = "rankingId" AND r."arenaId" = public.current_arena_id()))
      WITH CHECK (EXISTS (SELECT 1 FROM "RankingProfile" r WHERE r.id = "rankingId" AND r."arenaId" = public.current_arena_id()))', child);
  END LOOP;
END $$;

ALTER TABLE "LeagueAthleteTier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeagueAthleteTier" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_league_athlete_tier" ON "LeagueAthleteTier"
USING ("arenaId" = public.current_arena_id())
WITH CHECK ("arenaId" = public.current_arena_id()
  AND EXISTS (SELECT 1 FROM "Player" p WHERE p.id = "playerId" AND p."arenaId" = public.current_arena_id())
  AND ("leagueCycleId" IS NULL OR EXISTS (
    SELECT 1 FROM "LeagueCycle" lc JOIN "CategoryCompetition" c ON c.id = lc."competitionId"
      JOIN "TournamentCategory" tc ON tc.id = c."categoryId" JOIN "Tournament" t ON t.id = tc."tournamentId"
    WHERE lc.id = "leagueCycleId" AND t."arenaId" = public.current_arena_id()
  )));

ALTER TABLE "LeagueChallenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeagueChallenge" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_league_challenge" ON "LeagueChallenge"
USING ("arenaId" = public.current_arena_id())
WITH CHECK ("arenaId" = public.current_arena_id()
  AND EXISTS (SELECT 1 FROM "Court" court WHERE court.id = "courtId" AND court."arenaId" = public.current_arena_id())
  AND EXISTS (SELECT 1 FROM "CategoryCompetition" c JOIN "TournamentCategory" tc ON tc.id = c."categoryId"
    JOIN "Tournament" t ON t.id = tc."tournamentId" WHERE c.id = "LeagueChallenge"."competitionId" AND t."arenaId" = public.current_arena_id())
  AND EXISTS (SELECT 1 FROM "CategoryMatch" m WHERE m.id = "categoryMatchId" AND m."competitionId" = "LeagueChallenge"."competitionId"
    AND ((m."homePairId" = "proposerPairId" AND m."awayPairId" = "opponentPairId")
      OR (m."awayPairId" = "proposerPairId" AND m."homePairId" = "opponentPairId")))
  AND EXISTS (SELECT 1 FROM "CategoryPair" p WHERE p.id = "proposerPairId" AND p."competitionId" = "LeagueChallenge"."competitionId")
  AND EXISTS (SELECT 1 FROM "CategoryPair" p WHERE p.id = "opponentPairId" AND p."competitionId" = "LeagueChallenge"."competitionId")
  AND ("responderId" IS NULL OR EXISTS (SELECT 1 FROM "Player" p WHERE p.id = "responderId" AND p."arenaId" = public.current_arena_id())));

ALTER TABLE "Super12Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Super12Event" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_super12_event" ON "Super12Event"
USING ("arenaId" = public.current_arena_id())
WITH CHECK ("arenaId" = public.current_arena_id()
  AND EXISTS (SELECT 1 FROM "Player" p WHERE p.id = "creatorId" AND p."arenaId" = public.current_arena_id()));

ALTER TABLE "Super12Group" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Super12Group" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_super12_group" ON "Super12Group"
USING (EXISTS (SELECT 1 FROM "Super12Event" e WHERE e.id = "eventId" AND e."arenaId" = public.current_arena_id()))
WITH CHECK (EXISTS (SELECT 1 FROM "Super12Event" e WHERE e.id = "eventId" AND e."arenaId" = public.current_arena_id()));

ALTER TABLE "Super12Pair" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Super12Pair" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_super12_pair" ON "Super12Pair"
USING (EXISTS (SELECT 1 FROM "Super12Event" e WHERE e.id = "eventId" AND e."arenaId" = public.current_arena_id()))
WITH CHECK (EXISTS (SELECT 1 FROM "Super12Event" e WHERE e.id = "eventId" AND e."arenaId" = public.current_arena_id())
  AND ("groupId" IS NULL OR EXISTS (SELECT 1 FROM "Super12Group" g WHERE g.id = "groupId" AND g."eventId" = "Super12Pair"."eventId")));

ALTER TABLE "Super12PairPlayer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Super12PairPlayer" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_super12_pair_player" ON "Super12PairPlayer"
USING (EXISTS (SELECT 1 FROM "Super12Pair" p JOIN "Super12Event" e ON e.id = p."eventId" WHERE p.id = "pairId" AND e."arenaId" = public.current_arena_id()))
WITH CHECK (EXISTS (SELECT 1 FROM "Super12Pair" p JOIN "Super12Event" e ON e.id = p."eventId" WHERE p.id = "pairId" AND e."arenaId" = public.current_arena_id())
  AND EXISTS (SELECT 1 FROM "Player" player WHERE player.id = "playerId" AND player."arenaId" = public.current_arena_id()));

ALTER TABLE "Super12Match" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Super12Match" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_super12_match" ON "Super12Match"
USING (EXISTS (SELECT 1 FROM "Super12Event" e WHERE e.id = "eventId" AND e."arenaId" = public.current_arena_id()))
WITH CHECK (EXISTS (SELECT 1 FROM "Super12Event" e WHERE e.id = "eventId" AND e."arenaId" = public.current_arena_id())
  AND ("groupId" IS NULL OR EXISTS (SELECT 1 FROM "Super12Group" g WHERE g.id = "groupId" AND g."eventId" = "Super12Match"."eventId"))
  AND ("homePairId" IS NULL OR EXISTS (SELECT 1 FROM "Super12Pair" p WHERE p.id = "homePairId" AND p."eventId" = "Super12Match"."eventId"))
  AND ("awayPairId" IS NULL OR EXISTS (SELECT 1 FROM "Super12Pair" p WHERE p.id = "awayPairId" AND p."eventId" = "Super12Match"."eventId")));
