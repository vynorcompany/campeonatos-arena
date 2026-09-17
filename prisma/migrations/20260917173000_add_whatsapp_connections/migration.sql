CREATE TABLE "WhatsAppConnection" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'EVOLUTION',
  "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
  "instanceName" TEXT NOT NULL,
  "encryptedToken" TEXT NOT NULL DEFAULT '',
  "qrCodeDataUrl" TEXT NOT NULL DEFAULT '',
  "connectedPhone" TEXT NOT NULL DEFAULT '',
  "webhookSecretHash" TEXT NOT NULL DEFAULT '',
  "lastError" TEXT NOT NULL DEFAULT '',
  "lastConnectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "WhatsAppConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WhatsAppConnection_instanceName_key" ON "WhatsAppConnection"("instanceName");
CREATE UNIQUE INDEX "WhatsAppConnection_arenaId_key" ON "WhatsAppConnection"("arenaId");
CREATE INDEX "WhatsAppConnection_status_idx" ON "WhatsAppConnection"("status");
ALTER TABLE "WhatsAppConnection" ADD CONSTRAINT "WhatsAppConnection_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
