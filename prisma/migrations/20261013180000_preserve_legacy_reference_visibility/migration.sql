-- Preserve visibility of existing arena-owned records while preventing any
-- new cross-arena link through the WITH CHECK clauses installed previously.
-- Inconsistent legacy references need a separate, reviewed cleanup rather
-- than making the owning product, payment or fiscal document disappear.
ALTER POLICY "arena_scope_hardened_Product" ON "Product"
  USING ("arenaId" = public.current_arena_id());

ALTER POLICY "arena_scope_hardened_FiscalDocument" ON "FiscalDocument"
  USING ("arenaId" = public.current_arena_id());

ALTER POLICY "arena_scope_hardened_fiscal_item" ON "FiscalDocumentItem"
  USING (EXISTS (
    SELECT 1 FROM "FiscalDocument" d
    WHERE d.id = "FiscalDocumentItem"."fiscalDocumentId"
      AND d."arenaId" = public.current_arena_id()
  ));

ALTER POLICY "arena_scope_hardened_StockMovement" ON "StockMovement"
  USING ("arenaId" = public.current_arena_id());

ALTER POLICY "arena_scope_financial_settlement" ON "FinancialSettlement"
  USING ("arenaId" = public.current_arena_id());

ALTER POLICY "arena_scope_hardened_CashMovement" ON "CashMovement"
  USING ("arenaId" = public.current_arena_id());
