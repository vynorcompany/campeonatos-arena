ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_hardened_Product" ON "Product" USING ("arenaId" = public.current_arena_id()) WITH CHECK ("arenaId" = public.current_arena_id());

ALTER TABLE "ProductCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductCategory" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_hardened_ProductCategory" ON "ProductCategory" USING ("arenaId" = public.current_arena_id()) WITH CHECK ("arenaId" = public.current_arena_id());

ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_hardened_StockMovement" ON "StockMovement" USING ("arenaId" = public.current_arena_id()) WITH CHECK ("arenaId" = public.current_arena_id());

ALTER TABLE "FiscalSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FiscalSettings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_hardened_FiscalSettings" ON "FiscalSettings" USING ("arenaId" = public.current_arena_id()) WITH CHECK ("arenaId" = public.current_arena_id());

ALTER TABLE "FiscalDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FiscalDocument" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_hardened_FiscalDocument" ON "FiscalDocument" USING ("arenaId" = public.current_arena_id()) WITH CHECK ("arenaId" = public.current_arena_id());

ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Supplier" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_hardened_Supplier" ON "Supplier" USING ("arenaId" = public.current_arena_id()) WITH CHECK ("arenaId" = public.current_arena_id());

ALTER TABLE "BankAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankAccount" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_hardened_BankAccount" ON "BankAccount" USING ("arenaId" = public.current_arena_id()) WITH CHECK ("arenaId" = public.current_arena_id());

ALTER TABLE "FinancialCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialCategory" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_hardened_FinancialCategory" ON "FinancialCategory" USING ("arenaId" = public.current_arena_id()) WITH CHECK ("arenaId" = public.current_arena_id());

ALTER TABLE "PaymentMethodSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentMethodSetting" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_hardened_PaymentMethodSetting" ON "PaymentMethodSetting" USING ("arenaId" = public.current_arena_id()) WITH CHECK ("arenaId" = public.current_arena_id());

ALTER TABLE "Coupon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Coupon" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_hardened_Coupon" ON "Coupon" USING ("arenaId" = public.current_arena_id()) WITH CHECK ("arenaId" = public.current_arena_id());

ALTER TABLE "CashRegister" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashRegister" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_hardened_CashRegister" ON "CashRegister" USING ("arenaId" = public.current_arena_id()) WITH CHECK ("arenaId" = public.current_arena_id());

ALTER TABLE "CashMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashMovement" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_hardened_CashMovement" ON "CashMovement" USING ("arenaId" = public.current_arena_id()) WITH CHECK ("arenaId" = public.current_arena_id());

ALTER TABLE "FiscalDocumentItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FiscalDocumentItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_hardened_fiscal_item" ON "FiscalDocumentItem" USING (EXISTS (SELECT 1 FROM "FiscalDocument" d WHERE d.id = "FiscalDocumentItem"."fiscalDocumentId" AND d."arenaId" = public.current_arena_id())) WITH CHECK (EXISTS (SELECT 1 FROM "FiscalDocument" d WHERE d.id = "FiscalDocumentItem"."fiscalDocumentId" AND d."arenaId" = public.current_arena_id()));
