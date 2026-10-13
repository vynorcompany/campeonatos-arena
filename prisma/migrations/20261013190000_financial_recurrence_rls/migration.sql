-- Recurrences contain payment and customer details. Restrict the runtime
-- role to the active arena, including direct primary-key lookups.
ALTER TABLE "FinancialRecurrence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialRecurrence" FORCE ROW LEVEL SECURITY;

CREATE POLICY "arena_scope_financial_recurrence" ON "FinancialRecurrence"
  USING ("arenaId" = public.current_arena_id())
  WITH CHECK (
    "arenaId" = public.current_arena_id()
    AND ("supplierId" IS NULL OR EXISTS (
      SELECT 1 FROM "Supplier" s WHERE s.id = "FinancialRecurrence"."supplierId" AND s."arenaId" = "FinancialRecurrence"."arenaId"
    ))
    AND ("bankAccountId" IS NULL OR EXISTS (
      SELECT 1 FROM "BankAccount" b WHERE b.id = "FinancialRecurrence"."bankAccountId" AND b."arenaId" = "FinancialRecurrence"."arenaId"
    ))
    AND ("planId" IS NULL OR EXISTS (
      SELECT 1 FROM "Plan" p WHERE p.id = "FinancialRecurrence"."planId" AND p."arenaId" = "FinancialRecurrence"."arenaId"
    ))
    AND ("playerId" IS NULL OR EXISTS (
      SELECT 1 FROM "Player" p WHERE p.id = "FinancialRecurrence"."playerId" AND p."arenaId" = "FinancialRecurrence"."arenaId"
    ))
  );
