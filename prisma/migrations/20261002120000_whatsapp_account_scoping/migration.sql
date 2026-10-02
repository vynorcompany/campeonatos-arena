ALTER TABLE "WhatsAppConversation" ADD COLUMN "accountJid" TEXT NOT NULL DEFAULT '';
DROP INDEX "WhatsAppConversation_arenaId_remoteJid_key";
CREATE UNIQUE INDEX "WhatsAppConversation_arenaId_accountJid_remoteJid_key" ON "WhatsAppConversation"("arenaId", "accountJid", "remoteJid");
