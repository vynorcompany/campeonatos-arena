CREATE TABLE "AccountActionToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "arenaId" TEXT,
  "userId" TEXT,
  "arenaRole" TEXT NOT NULL DEFAULT 'STAFF',
  "profileId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountActionToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccountActionToken_tokenHash_key" ON "AccountActionToken"("tokenHash");
CREATE INDEX "AccountActionToken_email_kind_createdAt_idx" ON "AccountActionToken"("email", "kind", "createdAt");
CREATE INDEX "AccountActionToken_arenaId_kind_usedAt_idx" ON "AccountActionToken"("arenaId", "kind", "usedAt");
CREATE INDEX "AccountActionToken_expiresAt_idx" ON "AccountActionToken"("expiresAt");
ALTER TABLE "AccountActionToken" ADD CONSTRAINT "AccountActionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
