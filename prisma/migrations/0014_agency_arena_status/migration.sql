ALTER TABLE "Arena"
ADD COLUMN "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "agencyNotes" TEXT NOT NULL DEFAULT '';

CREATE INDEX "Arena_accountStatus_idx" ON "Arena"("accountStatus");
