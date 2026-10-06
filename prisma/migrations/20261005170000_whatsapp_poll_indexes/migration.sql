-- Match the current inbox/account filters before their ordering columns.
CREATE INDEX "WhatsAppConversation_arenaId_accountJid_updatedAt_idx" ON "WhatsAppConversation"("arenaId", "accountJid", "updatedAt");
CREATE INDEX "WhatsAppConversation_arenaId_accountJid_lastMessageAt_idx" ON "WhatsAppConversation"("arenaId", "accountJid", "lastMessageAt");
