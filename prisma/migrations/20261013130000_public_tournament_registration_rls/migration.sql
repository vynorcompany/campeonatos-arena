-- Inscricoes publicas contem identificacao e dados de cobranca dos atletas.
-- Torneio e categoria devem pertencer ao mesmo cadastro e a arena ativa.
ALTER TABLE "PublicTournamentRegistration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublicTournamentRegistration" FORCE ROW LEVEL SECURITY;

CREATE POLICY "arena_scope_public_tournament_registration" ON "PublicTournamentRegistration"
  USING (EXISTS (
    SELECT 1 FROM "Tournament" t
    JOIN "TournamentCategory" c ON c."tournamentId" = t.id
    WHERE t.id = "PublicTournamentRegistration"."tournamentId"
      AND c.id = "PublicTournamentRegistration"."categoryId"
      AND t."arenaId" = public.current_arena_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "Tournament" t
    JOIN "TournamentCategory" c ON c."tournamentId" = t.id
    WHERE t.id = "PublicTournamentRegistration"."tournamentId"
      AND c.id = "PublicTournamentRegistration"."categoryId"
      AND t."arenaId" = public.current_arena_id()
  ));
