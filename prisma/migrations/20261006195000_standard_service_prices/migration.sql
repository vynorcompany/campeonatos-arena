CREATE TABLE "ArenaServicePrice" (
  "arenaId" TEXT NOT NULL,
  "serviceCode" TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedByUserId" TEXT,
  CONSTRAINT "ArenaServicePrice_pkey" PRIMARY KEY ("arenaId", "serviceCode"),
  CONSTRAINT "ArenaServicePrice_code_check" CHECK ("serviceCode" IN ('LEAGUE', 'SUPER12')),
  CONSTRAINT "ArenaServicePrice_price_check" CHECK ("priceCents" >= 0),
  CONSTRAINT "ArenaServicePrice_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "ArenaServicePrice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArenaServicePrice" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_service_price" ON "ArenaServicePrice"
  USING ("arenaId" = public.current_arena_id())
  WITH CHECK ("arenaId" = public.current_arena_id());
REVOKE ALL ON TABLE "ArenaServicePrice" FROM arena_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE "ArenaServicePrice" TO arena_runtime;
