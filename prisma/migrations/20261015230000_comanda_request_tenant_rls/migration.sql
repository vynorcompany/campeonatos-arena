-- Requests belong to their comanda, but must never expose or link another arena's product.
ALTER TABLE "ComandaRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComandaRequest" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ComandaRequest" TO arena_runtime;

CREATE POLICY "arena_scope_comanda_request" ON "ComandaRequest"
  USING (
    EXISTS (
      SELECT 1 FROM "Comanda" c
      JOIN "Product" p ON p.id = "ComandaRequest"."productId"
      WHERE c.id = "ComandaRequest"."comandaId"
        AND c."arenaId" = (SELECT public.current_arena_id())
        AND p."arenaId" = c."arenaId"
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Comanda" c
      JOIN "Product" p ON p.id = "ComandaRequest"."productId"
      WHERE c.id = "ComandaRequest"."comandaId"
        AND c."arenaId" = (SELECT public.current_arena_id())
        AND p."arenaId" = c."arenaId"
    )
  );
