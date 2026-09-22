ALTER TABLE "Arena" ADD COLUMN "whatsappSlaMinutes" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "WhatsAppConversation" ADD COLUMN "playerId" TEXT;

CREATE INDEX "WhatsAppConversation_playerId_idx" ON "WhatsAppConversation"("playerId");

ALTER TABLE "WhatsAppConversation"
  ADD CONSTRAINT "WhatsAppConversation_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
