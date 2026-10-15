-- A conexão operacional só pode acessar clientes da arena definida nesta transação.
-- Consultas globais de agência usam tabelas próprias e não dependem deste acesso.
ALTER TABLE "Player" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Player" FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON "Player" TO arena_runtime;

CREATE POLICY "arena_scope_player" ON "Player"
  USING ("arenaId" = (SELECT public.current_arena_id()))
  WITH CHECK ("arenaId" = (SELECT public.current_arena_id()));
