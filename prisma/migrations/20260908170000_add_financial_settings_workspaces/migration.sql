CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
  "discountValue" INTEGER NOT NULL,
  "minimumAmountCents" INTEGER NOT NULL DEFAULT 0,
  "maxUses" INTEGER,
  "usesCount" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FiscalSettings" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'NONE',
  "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "series" TEXT NOT NULL DEFAULT '',
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "FiscalSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnlinePaymentSettings" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'NONE',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "pixEnabled" BOOLEAN NOT NULL DEFAULT true,
  "cardEnabled" BOOLEAN NOT NULL DEFAULT false,
  "webhookUrl" TEXT NOT NULL DEFAULT '',
  "instructions" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "OnlinePaymentSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Coupon_arenaId_code_key" ON "Coupon"("arenaId", "code");
CREATE INDEX "Coupon_arenaId_active_idx" ON "Coupon"("arenaId", "active");
CREATE UNIQUE INDEX "FiscalSettings_arenaId_key" ON "FiscalSettings"("arenaId");
CREATE UNIQUE INDEX "OnlinePaymentSettings_arenaId_key" ON "OnlinePaymentSettings"("arenaId");

ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FiscalSettings" ADD CONSTRAINT "FiscalSettings_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnlinePaymentSettings" ADD CONSTRAINT "OnlinePaymentSettings_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
