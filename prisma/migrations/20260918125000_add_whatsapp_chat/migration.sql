CREATE TABLE "WhatsAppConversation" (
  "id" TEXT NOT NULL,
  "remoteJid" TEXT NOT NULL,
  "contactName" TEXT NOT NULL DEFAULT '',
  "contactPhone" TEXT NOT NULL DEFAULT '',
  "unreadCount" INTEGER NOT NULL DEFAULT 0,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "WhatsAppConversation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WhatsAppMessage" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "body" TEXT NOT NULL DEFAULT '',
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "conversationId" TEXT NOT NULL,
  CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WhatsAppConversation_arenaId_remoteJid_key" ON "WhatsAppConversation"("arenaId", "remoteJid");
CREATE INDEX "WhatsAppConversation_arenaId_unreadCount_lastMessageAt_idx" ON "WhatsAppConversation"("arenaId", "unreadCount", "lastMessageAt");
CREATE UNIQUE INDEX "WhatsAppMessage_providerId_key" ON "WhatsAppMessage"("providerId");
CREATE INDEX "WhatsAppMessage_conversationId_sentAt_idx" ON "WhatsAppMessage"("conversationId", "sentAt");
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsAppConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
