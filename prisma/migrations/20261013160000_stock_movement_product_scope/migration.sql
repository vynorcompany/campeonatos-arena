-- A movimentacao so pode se referir a produto da arena ativa.
ALTER POLICY "arena_scope_hardened_StockMovement" ON "StockMovement"
  USING (
    "arenaId" = public.current_arena_id()
    AND EXISTS (
      SELECT 1 FROM "Product" p
      WHERE p.id = "StockMovement"."productId"
        AND p."arenaId" = "StockMovement"."arenaId"
    )
  )
  WITH CHECK (
    "arenaId" = public.current_arena_id()
    AND EXISTS (
      SELECT 1 FROM "Product" p
      WHERE p.id = "StockMovement"."productId"
        AND p."arenaId" = "StockMovement"."arenaId"
    )
  );
