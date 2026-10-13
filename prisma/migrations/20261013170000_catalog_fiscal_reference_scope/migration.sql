-- A arena declarada no registro deve coincidir com a arena de cada vinculo.
-- As FKs simples garantem existencia, mas nao garantem pertencimento.
ALTER POLICY "arena_scope_hardened_Product" ON "Product"
  USING (
    "arenaId" = public.current_arena_id()
    AND ("categoryId" IS NULL OR EXISTS (
      SELECT 1 FROM "ProductCategory" c
      WHERE c.id = "Product"."categoryId" AND c."arenaId" = "Product"."arenaId"
    ))
  )
  WITH CHECK (
    "arenaId" = public.current_arena_id()
    AND ("categoryId" IS NULL OR EXISTS (
      SELECT 1 FROM "ProductCategory" c
      WHERE c.id = "Product"."categoryId" AND c."arenaId" = "Product"."arenaId"
    ))
  );

ALTER POLICY "arena_scope_hardened_FiscalDocument" ON "FiscalDocument"
  USING (
    "arenaId" = public.current_arena_id()
    AND ("financialEntryId" IS NULL OR EXISTS (
      SELECT 1 FROM "FinancialEntry" e
      WHERE e.id = "FiscalDocument"."financialEntryId" AND e."arenaId" = "FiscalDocument"."arenaId"
    ))
    AND ("saleId" IS NULL OR EXISTS (
      SELECT 1 FROM "Sale" s
      WHERE s.id = "FiscalDocument"."saleId" AND s."arenaId" = "FiscalDocument"."arenaId"
    ))
  )
  WITH CHECK (
    "arenaId" = public.current_arena_id()
    AND ("financialEntryId" IS NULL OR EXISTS (
      SELECT 1 FROM "FinancialEntry" e
      WHERE e.id = "FiscalDocument"."financialEntryId" AND e."arenaId" = "FiscalDocument"."arenaId"
    ))
    AND ("saleId" IS NULL OR EXISTS (
      SELECT 1 FROM "Sale" s
      WHERE s.id = "FiscalDocument"."saleId" AND s."arenaId" = "FiscalDocument"."arenaId"
    ))
  );

ALTER POLICY "arena_scope_hardened_fiscal_item" ON "FiscalDocumentItem"
  USING (
    EXISTS (
      SELECT 1 FROM "FiscalDocument" d
      WHERE d.id = "FiscalDocumentItem"."fiscalDocumentId" AND d."arenaId" = public.current_arena_id()
    )
    AND ("productId" IS NULL OR EXISTS (
      SELECT 1 FROM "Product" p JOIN "FiscalDocument" d ON d.id = "FiscalDocumentItem"."fiscalDocumentId"
      WHERE p.id = "FiscalDocumentItem"."productId" AND p."arenaId" = d."arenaId"
    ))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "FiscalDocument" d
      WHERE d.id = "FiscalDocumentItem"."fiscalDocumentId" AND d."arenaId" = public.current_arena_id()
    )
    AND ("productId" IS NULL OR EXISTS (
      SELECT 1 FROM "Product" p JOIN "FiscalDocument" d ON d.id = "FiscalDocumentItem"."fiscalDocumentId"
      WHERE p.id = "FiscalDocumentItem"."productId" AND p."arenaId" = d."arenaId"
    ))
  );
