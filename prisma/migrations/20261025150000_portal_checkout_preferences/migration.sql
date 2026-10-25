ALTER TABLE "ArenaOperationalSettings" ADD COLUMN "portalPaymentsConfigured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OnlinePaymentCheckout" ADD COLUMN "expiresAt" TIMESTAMP(3);
