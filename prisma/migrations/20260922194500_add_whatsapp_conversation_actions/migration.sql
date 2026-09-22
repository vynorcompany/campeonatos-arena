ALTER TABLE "WhatsAppConversation"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "favorite" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "listName" TEXT NOT NULL DEFAULT '';

CREATE INDEX "WhatsAppConversation_arenaId_archivedAt_lastMessageAt_idx"
  ON "WhatsAppConversation"("arenaId", "archivedAt", "lastMessageAt");
