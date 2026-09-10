CREATE TABLE "PaymentConnection" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "displayName" TEXT NOT NULL DEFAULT '',
  "accountReference" TEXT NOT NULL DEFAULT '',
  "encryptedSecrets" TEXT NOT NULL DEFAULT '',
  "webhookSecretHash" TEXT NOT NULL DEFAULT '',
  "expiresAt" TIMESTAMP(3),
  "lastValidatedAt" TIMESTAMP(3),
  "lastError" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "PaymentConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentConnection_arenaId_provider_key" ON "PaymentConnection"("arenaId", "provider");
CREATE INDEX "PaymentConnection_arenaId_status_idx" ON "PaymentConnection"("arenaId", "status");
ALTER TABLE "PaymentConnection" ADD CONSTRAINT "PaymentConnection_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
