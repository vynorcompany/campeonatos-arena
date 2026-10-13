DROP INDEX "WhatsAppMessage_providerId_key";
CREATE UNIQUE INDEX "WhatsAppMessage_conversationId_providerId_key" ON "WhatsAppMessage"("conversationId", "providerId");
