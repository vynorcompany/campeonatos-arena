ALTER TABLE "OnlinePaymentCheckout"
  ADD COLUMN "mercadoPagoPreferenceId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "expiryCheckClaimedAt" TIMESTAMP(3);

CREATE INDEX "OnlinePaymentCheckout_arenaId_status_expiresAt_idx"
  ON "OnlinePaymentCheckout"("arenaId", "status", "expiresAt");
