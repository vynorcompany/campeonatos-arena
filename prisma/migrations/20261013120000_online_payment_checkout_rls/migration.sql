-- Checkout e seus itens contem dados financeiros do atleta. O runtime so os
-- acessa quando a transacao define a arena proprietaria.
ALTER TABLE "OnlinePaymentCheckout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OnlinePaymentCheckout" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_online_payment_checkout" ON "OnlinePaymentCheckout"
  USING ("arenaId" = public.current_arena_id())
  WITH CHECK ("arenaId" = public.current_arena_id());

ALTER TABLE "OnlinePaymentCheckoutItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OnlinePaymentCheckoutItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_online_payment_checkout_item" ON "OnlinePaymentCheckoutItem"
  USING (EXISTS (
    SELECT 1 FROM "OnlinePaymentCheckout" c
    WHERE c.id = "OnlinePaymentCheckoutItem"."checkoutId"
      AND c."arenaId" = public.current_arena_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "OnlinePaymentCheckout" c
    JOIN "FinancialEntry" e ON e.id = "OnlinePaymentCheckoutItem"."financialEntryId"
    WHERE c.id = "OnlinePaymentCheckoutItem"."checkoutId"
      AND c."arenaId" = public.current_arena_id()
      AND e."arenaId" = c."arenaId"
  ));
