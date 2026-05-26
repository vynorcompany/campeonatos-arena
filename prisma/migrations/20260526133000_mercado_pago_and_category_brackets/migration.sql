ALTER TABLE "PublicTournamentRegistration" ADD COLUMN IF NOT EXISTS "mercadoPagoPaymentId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PublicTournamentRegistration" ADD COLUMN IF NOT EXISTS "paymentQrCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PublicTournamentRegistration" ADD COLUMN IF NOT EXISTS "paymentQrCodeBase64" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PublicTournamentRegistration" ADD COLUMN IF NOT EXISTS "paymentCheckoutUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PublicTournamentRegistration" ADD COLUMN IF NOT EXISTS "paymentExpiresAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "CategoryBracket" (
  "id" TEXT PRIMARY KEY,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  CONSTRAINT "CategoryBracket_tournamentId_fkey"
    FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CategoryBracket_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "TournamentCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CategoryBracketMatch" (
  "id" TEXT PRIMARY KEY,
  "label" TEXT NOT NULL,
  "roundOrder" INTEGER NOT NULL,
  "stage" TEXT NOT NULL,
  "courtName" TEXT NOT NULL DEFAULT '',
  "scheduledTime" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'WAITING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "bracketId" TEXT NOT NULL,
  "homeRegistrationId" TEXT,
  "awayRegistrationId" TEXT,
  "winnerRegistrationId" TEXT,
  CONSTRAINT "CategoryBracketMatch_bracketId_fkey"
    FOREIGN KEY ("bracketId") REFERENCES "CategoryBracket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CategoryBracketMatch_homeRegistrationId_fkey"
    FOREIGN KEY ("homeRegistrationId") REFERENCES "PublicTournamentRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CategoryBracketMatch_awayRegistrationId_fkey"
    FOREIGN KEY ("awayRegistrationId") REFERENCES "PublicTournamentRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CategoryBracketMatch_winnerRegistrationId_fkey"
    FOREIGN KEY ("winnerRegistrationId") REFERENCES "PublicTournamentRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CategoryBracket_tournamentId_categoryId_key" ON "CategoryBracket"("tournamentId", "categoryId");
CREATE INDEX IF NOT EXISTS "CategoryBracket_categoryId_createdAt_idx" ON "CategoryBracket"("categoryId", "createdAt");
CREATE INDEX IF NOT EXISTS "CategoryBracketMatch_bracketId_roundOrder_idx" ON "CategoryBracketMatch"("bracketId", "roundOrder");
CREATE INDEX IF NOT EXISTS "CategoryBracketMatch_homeRegistrationId_idx" ON "CategoryBracketMatch"("homeRegistrationId");
CREATE INDEX IF NOT EXISTS "CategoryBracketMatch_awayRegistrationId_idx" ON "CategoryBracketMatch"("awayRegistrationId");
CREATE INDEX IF NOT EXISTS "CategoryBracketMatch_winnerRegistrationId_idx" ON "CategoryBracketMatch"("winnerRegistrationId");
