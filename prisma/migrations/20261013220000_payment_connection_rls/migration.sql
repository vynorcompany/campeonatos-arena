-- Arena payment tokens and webhook secrets must not be visible to another
-- tenant, even if a caller forgets an application-level arena filter.
ALTER TABLE "PaymentConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentConnection" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_payment_connection" ON "PaymentConnection"
  USING ("arenaId" = public.current_arena_id())
  WITH CHECK ("arenaId" = public.current_arena_id());
