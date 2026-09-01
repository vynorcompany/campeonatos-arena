CREATE TABLE "PlayerAuthAttempt" (
  "id" TEXT NOT NULL,
  "arenaId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerAuthAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerVerificationCode" (
  "id" TEXT NOT NULL,
  "arenaId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerVerificationCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArenaPublicSlug" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "ArenaPublicSlug_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerAuthAttempt_arenaId_phone_key" ON "PlayerAuthAttempt"("arenaId", "phone");
CREATE INDEX "PlayerAuthAttempt_lockedUntil_idx" ON "PlayerAuthAttempt"("lockedUntil");
CREATE INDEX "PlayerVerificationCode_arenaId_phone_purpose_expiresAt_idx" ON "PlayerVerificationCode"("arenaId", "phone", "purpose", "expiresAt");
CREATE UNIQUE INDEX "ArenaPublicSlug_slug_key" ON "ArenaPublicSlug"("slug");
CREATE INDEX "ArenaPublicSlug_arenaId_idx" ON "ArenaPublicSlug"("arenaId");
ALTER TABLE "PlayerAuthAttempt" ADD CONSTRAINT "PlayerAuthAttempt_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerVerificationCode" ADD CONSTRAINT "PlayerVerificationCode_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArenaPublicSlug" ADD CONSTRAINT "ArenaPublicSlug_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
