-- Keep operational modules independent while preserving their source/audit metadata.
ALTER TABLE "Plan" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "Plan" ADD COLUMN "updatedByUserId" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "updatedByUserId" TEXT;
ALTER TABLE "Product" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "Product" ADD COLUMN "updatedByUserId" TEXT;
ALTER TABLE "FinancialEntry" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "FinancialEntry" ADD COLUMN "externalReference" TEXT NOT NULL DEFAULT '';

CREATE TABLE "AssistantConversation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Assistente da Arena',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "arenaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "AssistantConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssistantMessage" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationId" TEXT NOT NULL,
    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssistantCommand" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "input" TEXT NOT NULL,
    "output" TEXT NOT NULL DEFAULT '',
    "targetModule" TEXT NOT NULL DEFAULT '',
    "targetId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "arenaId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    CONSTRAINT "AssistantCommand_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssistantConversation_arenaId_userId_key" ON "AssistantConversation"("arenaId", "userId");
CREATE INDEX "AssistantConversation_arenaId_updatedAt_idx" ON "AssistantConversation"("arenaId", "updatedAt");
CREATE INDEX "AssistantMessage_conversationId_createdAt_idx" ON "AssistantMessage"("conversationId", "createdAt");
CREATE INDEX "AssistantCommand_arenaId_createdAt_idx" ON "AssistantCommand"("arenaId", "createdAt");
CREATE INDEX "AssistantCommand_conversationId_createdAt_idx" ON "AssistantCommand"("conversationId", "createdAt");

ALTER TABLE "AssistantConversation" ADD CONSTRAINT "AssistantConversation_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssistantCommand" ADD CONSTRAINT "AssistantCommand_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssistantCommand" ADD CONSTRAINT "AssistantCommand_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
