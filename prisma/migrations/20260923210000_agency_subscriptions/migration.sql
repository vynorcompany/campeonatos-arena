CREATE TABLE "AgencyPlan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "monthlyPriceCents" INTEGER NOT NULL,
  "trialDays" INTEGER NOT NULL DEFAULT 0,
  "isTrial" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgencyPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AgencyPlan_name_key" ON "AgencyPlan"("name");

CREATE TABLE "AgencySubscription" (
  "id" TEXT NOT NULL,
  "arenaId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "billingDay" INTEGER NOT NULL DEFAULT 1,
  "trialEndsAt" TIMESTAMP(3),
  "nextDueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgencySubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AgencySubscription_arenaId_key" ON "AgencySubscription"("arenaId");
CREATE INDEX "AgencySubscription_status_nextDueAt_idx" ON "AgencySubscription"("status", "nextDueAt");
CREATE INDEX "AgencySubscription_planId_status_idx" ON "AgencySubscription"("planId", "status");
ALTER TABLE "AgencySubscription" ADD CONSTRAINT "AgencySubscription_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgencySubscription" ADD CONSTRAINT "AgencySubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AgencyPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AgencyInvoice" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "arenaId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "checkoutUrl" TEXT NOT NULL DEFAULT '',
  "providerPaymentId" TEXT NOT NULL DEFAULT '',
  "financialEntryId" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgencyInvoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AgencyInvoice_financialEntryId_key" ON "AgencyInvoice"("financialEntryId");
CREATE UNIQUE INDEX "AgencyInvoice_subscriptionId_period_key" ON "AgencyInvoice"("subscriptionId", "period");
CREATE INDEX "AgencyInvoice_arenaId_status_dueAt_idx" ON "AgencyInvoice"("arenaId", "status", "dueAt");
CREATE INDEX "AgencyInvoice_providerPaymentId_idx" ON "AgencyInvoice"("providerPaymentId");
ALTER TABLE "AgencyInvoice" ADD CONSTRAINT "AgencyInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "AgencySubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgencyInvoice" ADD CONSTRAINT "AgencyInvoice_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgencyInvoice" ADD CONSTRAINT "AgencyInvoice_financialEntryId_fkey" FOREIGN KEY ("financialEntryId") REFERENCES "FinancialEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AgencyPaymentConnection" (
  "id" TEXT NOT NULL DEFAULT 'platform',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "displayName" TEXT NOT NULL DEFAULT '',
  "accountReference" TEXT NOT NULL DEFAULT '',
  "encryptedSecrets" TEXT NOT NULL DEFAULT '',
  "expiresAt" TIMESTAMP(3),
  "connectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgencyPaymentConnection_pkey" PRIMARY KEY ("id")
);

-- O plano de avaliação é global, gratuito e dura exatamente sete dias.
INSERT INTO "AgencyPlan" ("id", "name", "monthlyPriceCents", "trialDays", "isTrial", "updatedAt")
VALUES ('agency-trial-7-days', 'Trial — 7 dias', 0, 7, true, CURRENT_TIMESTAMP);

GRANT ALL PRIVILEGES ON "AgencyPlan", "AgencySubscription", "AgencyInvoice", "AgencyPaymentConnection" TO arena_runtime;
