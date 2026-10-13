-- A baixa deve pertencer a mesma arena do lancamento e, quando houver,
-- da venda vinculada. O arenaId declarado sozinho nao e suficiente.
ALTER POLICY "arena_scope_financial_settlement" ON "FinancialSettlement"
  USING (
    "arenaId" = public.current_arena_id()
    AND EXISTS (
      SELECT 1 FROM "FinancialEntry" e
      WHERE e.id = "FinancialSettlement"."financialEntryId"
        AND e."arenaId" = "FinancialSettlement"."arenaId"
    )
    AND (
      "saleId" IS NULL OR EXISTS (
        SELECT 1 FROM "Sale" s
        WHERE s.id = "FinancialSettlement"."saleId"
          AND s."arenaId" = "FinancialSettlement"."arenaId"
      )
    )
  )
  WITH CHECK (
    "arenaId" = public.current_arena_id()
    AND EXISTS (
      SELECT 1 FROM "FinancialEntry" e
      WHERE e.id = "FinancialSettlement"."financialEntryId"
        AND e."arenaId" = "FinancialSettlement"."arenaId"
    )
    AND (
      "saleId" IS NULL OR EXISTS (
        SELECT 1 FROM "Sale" s
        WHERE s.id = "FinancialSettlement"."saleId"
          AND s."arenaId" = "FinancialSettlement"."arenaId"
      )
    )
  );
