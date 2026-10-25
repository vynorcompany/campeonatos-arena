ALTER TABLE "ArenaOperationalSettings"
  ADD COLUMN "cancellationPolicy" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "cancellationPolicyPublished" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "cancellationPolicyUpdatedAt" TIMESTAMP(3);
ALTER TABLE "ArenaOperationalSettings" ADD CONSTRAINT "ArenaOperationalSettings_published_policy"
  CHECK (NOT "cancellationPolicyPublished" OR length(trim("cancellationPolicy")) >= 30);
