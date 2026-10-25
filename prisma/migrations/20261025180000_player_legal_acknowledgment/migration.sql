ALTER TABLE "PlayerAccount"
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "termsVersion" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "privacyNoticeVersion" TEXT NOT NULL DEFAULT '';
