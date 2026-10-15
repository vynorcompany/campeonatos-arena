-- Keep historical sales visible, but reject new links to products owned by another arena.
ALTER POLICY "arena_scope_sale_item" ON "SaleItem"
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Sale" s
      WHERE s.id = "SaleItem"."saleId"
        AND s."arenaId" = (SELECT public.current_arena_id())
    )
    AND EXISTS (
      SELECT 1 FROM "Product" p
      JOIN "Sale" s ON s.id = "SaleItem"."saleId"
      WHERE p.id = "SaleItem"."productId"
        AND p."arenaId" = s."arenaId"
    )
  );
