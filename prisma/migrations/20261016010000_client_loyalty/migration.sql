ALTER TABLE "Arena"
  ADD COLUMN "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "loyaltyStartedAt" TIMESTAMP(3),
  ADD COLUMN "loyaltyVisitsRequired" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "loyaltyRewardLabel" TEXT NOT NULL DEFAULT 'Recompensa de fidelidade';

CREATE TABLE "LoyaltyActivity" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "visitsDelta" INTEGER NOT NULL,
  "rewardLabel" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "fulfilledAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "fulfilledByUserId" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "arenaId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  CONSTRAINT "LoyaltyActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LoyaltyActivity_arenaId_playerId_createdAt_idx" ON "LoyaltyActivity"("arenaId", "playerId", "createdAt");
ALTER TABLE "LoyaltyActivity" ADD CONSTRAINT "LoyaltyActivity_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyActivity" ADD CONSTRAINT "LoyaltyActivity_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LoyaltyActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoyaltyActivity" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "LoyaltyActivity" TO arena_runtime;
CREATE POLICY "arena_scope_loyalty_activity" ON "LoyaltyActivity"
  USING (
    "arenaId" = (SELECT public.current_arena_id())
    AND EXISTS (SELECT 1 FROM "Player" p WHERE p.id = "LoyaltyActivity"."playerId" AND p."arenaId" = "LoyaltyActivity"."arenaId")
  )
  WITH CHECK (
    "arenaId" = (SELECT public.current_arena_id())
    AND EXISTS (SELECT 1 FROM "Player" p WHERE p.id = "LoyaltyActivity"."playerId" AND p."arenaId" = "LoyaltyActivity"."arenaId")
  );
