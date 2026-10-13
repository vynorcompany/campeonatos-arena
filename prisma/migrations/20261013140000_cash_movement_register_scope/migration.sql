-- A arena da movimentacao deve ser a mesma do caixa associado.
-- Isso impede que um id de caixa externo seja ligado a uma movimentacao local.
ALTER POLICY "arena_scope_hardened_CashMovement" ON "CashMovement"
  USING (
    "arenaId" = public.current_arena_id()
    AND EXISTS (
      SELECT 1 FROM "CashRegister" r
      WHERE r.id = "CashMovement"."registerId"
        AND r."arenaId" = "CashMovement"."arenaId"
    )
  )
  WITH CHECK (
    "arenaId" = public.current_arena_id()
    AND EXISTS (
      SELECT 1 FROM "CashRegister" r
      WHERE r.id = "CashMovement"."registerId"
        AND r."arenaId" = "CashMovement"."arenaId"
    )
  );
