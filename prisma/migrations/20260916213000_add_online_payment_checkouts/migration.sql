CREATE TABLE "OnlinePaymentCheckout" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'MERCADO_PAGO',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "amountCents" INTEGER NOT NULL,
  "mercadoPagoPaymentId" TEXT NOT NULL DEFAULT '',
  "checkoutUrl" TEXT NOT NULL DEFAULT '',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  CONSTRAINT "OnlinePaymentCheckout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnlinePaymentCheckoutItem" (
  "id" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checkoutId" TEXT NOT NULL,
  "financialEntryId" TEXT NOT NULL,
  CONSTRAINT "OnlinePaymentCheckoutItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnlinePaymentCheckoutItem_checkoutId_financialEntryId_key" ON "OnlinePaymentCheckoutItem"("checkoutId", "financialEntryId");
CREATE INDEX "OnlinePaymentCheckout_arenaId_status_createdAt_idx" ON "OnlinePaymentCheckout"("arenaId", "status", "createdAt");
CREATE INDEX "OnlinePaymentCheckout_playerId_status_idx" ON "OnlinePaymentCheckout"("playerId", "status");
CREATE INDEX "OnlinePaymentCheckout_mercadoPagoPaymentId_idx" ON "OnlinePaymentCheckout"("mercadoPagoPaymentId");
CREATE INDEX "OnlinePaymentCheckoutItem_financialEntryId_idx" ON "OnlinePaymentCheckoutItem"("financialEntryId");

ALTER TABLE "OnlinePaymentCheckout" ADD CONSTRAINT "OnlinePaymentCheckout_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnlinePaymentCheckout" ADD CONSTRAINT "OnlinePaymentCheckout_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnlinePaymentCheckoutItem" ADD CONSTRAINT "OnlinePaymentCheckoutItem_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "OnlinePaymentCheckout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnlinePaymentCheckoutItem" ADD CONSTRAINT "OnlinePaymentCheckoutItem_financialEntryId_fkey" FOREIGN KEY ("financialEntryId") REFERENCES "FinancialEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
