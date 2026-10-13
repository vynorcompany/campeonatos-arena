-- Customer credits affect comanda settlement. A declared arenaId must match
-- the player being credited, and runtime reads require the active arena.
ALTER TABLE "ClientBalanceMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientBalanceMovement" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_client_balance_movement" ON "ClientBalanceMovement"
  USING ("arenaId" = public.current_arena_id())
  WITH CHECK (
    "arenaId" = public.current_arena_id()
    AND EXISTS (
      SELECT 1 FROM "Player" p
      WHERE p.id = "ClientBalanceMovement"."playerId"
        AND p."arenaId" = "ClientBalanceMovement"."arenaId"
    )
  );

ALTER TABLE "OnlinePaymentSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OnlinePaymentSettings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_online_payment_settings" ON "OnlinePaymentSettings"
  USING ("arenaId" = public.current_arena_id())
  WITH CHECK ("arenaId" = public.current_arena_id());
