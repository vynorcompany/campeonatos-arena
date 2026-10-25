ALTER TABLE "Session" ADD COLUMN "deviceLabel" TEXT NOT NULL DEFAULT '', ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Comanda" ADD COLUMN "closeRequestedAt" TIMESTAMP(3), ADD COLUMN "closeRequestedByPlayerId" TEXT, ADD COLUMN "cardNumber" TEXT;
CREATE UNIQUE INDEX "Comanda_open_card_unique" ON "Comanda" ("arenaId", "cardNumber") WHERE "status" = 'OPEN' AND "cardNumber" IS NOT NULL;
CREATE INDEX "Comanda_arena_close_requested_idx" ON "Comanda" ("arenaId", "closeRequestedAt") WHERE "status" = 'OPEN' AND "closeRequestedAt" IS NOT NULL;
CREATE TABLE "ArenaOperationalSettings" (
  "id" TEXT NOT NULL PRIMARY KEY, "arenaId" TEXT NOT NULL UNIQUE REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "cashRegisterRequired" BOOLEAN NOT NULL DEFAULT false,
  "comandaCardsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "preventOverpayment" BOOLEAN NOT NULL DEFAULT true,
  "requireFullPayment" BOOLEAN NOT NULL DEFAULT false,
  "blockDelinquentComandas" BOOLEAN NOT NULL DEFAULT false,
  "delinquentAfterDays" INTEGER NOT NULL DEFAULT 0,
  "whatsappUnpaidEnabled" BOOLEAN NOT NULL DEFAULT false,
  "whatsappPaidEnabled" BOOLEAN NOT NULL DEFAULT false,
  "whatsappMessage" TEXT NOT NULL DEFAULT '',
  "autoFiscalNfce" BOOLEAN NOT NULL DEFAULT false,
  "portalConsumptionEnabled" BOOLEAN NOT NULL DEFAULT true,
  "portalPaymentEnabled" BOOLEAN NOT NULL DEFAULT false,
  "portalPixEnabled" BOOLEAN NOT NULL DEFAULT true,
  "portalCreditCardEnabled" BOOLEAN NOT NULL DEFAULT false,
  "checkoutExpiryMinutes" INTEGER NOT NULL DEFAULT 0,
  "printerPaper" TEXT NOT NULL DEFAULT '80MM',
  "printerCopies" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArenaOperationalSettings_limits" CHECK ("delinquentAfterDays" BETWEEN 0 AND 3650 AND "checkoutExpiryMinutes" BETWEEN 0 AND 1440 AND "printerCopies" BETWEEN 1 AND 3 AND "printerPaper" IN ('58MM','80MM','A4'))
);
ALTER TABLE "ArenaOperationalSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArenaOperationalSettings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_operational_settings" ON "ArenaOperationalSettings" USING ("arenaId" = public.current_arena_id()) WITH CHECK ("arenaId" = public.current_arena_id());
