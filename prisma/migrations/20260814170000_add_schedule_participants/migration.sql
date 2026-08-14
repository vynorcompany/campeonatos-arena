ALTER TABLE "ScheduleOccurrence"
  ADD COLUMN "modality" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';

CREATE TABLE "ScheduleParticipant" (
  "id" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL DEFAULT 0,
  "paymentMethod" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "occurrenceId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "financialEntryId" TEXT,
  CONSTRAINT "ScheduleParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScheduleParticipant_occurrenceId_playerId_key" ON "ScheduleParticipant"("occurrenceId", "playerId");
CREATE UNIQUE INDEX "ScheduleParticipant_financialEntryId_key" ON "ScheduleParticipant"("financialEntryId");
CREATE INDEX "ScheduleParticipant_playerId_idx" ON "ScheduleParticipant"("playerId");

ALTER TABLE "ScheduleParticipant" ADD CONSTRAINT "ScheduleParticipant_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "ScheduleOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleParticipant" ADD CONSTRAINT "ScheduleParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleParticipant" ADD CONSTRAINT "ScheduleParticipant_financialEntryId_fkey" FOREIGN KEY ("financialEntryId") REFERENCES "FinancialEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
