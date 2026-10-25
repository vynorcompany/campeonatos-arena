CREATE TABLE "ErasedContactReference" (
  "id" TEXT PRIMARY KEY,
  "arenaId" TEXT NOT NULL REFERENCES "Arena"("id") ON DELETE CASCADE,
  "playerId" TEXT NOT NULL REFERENCES "Player"("id") ON DELETE RESTRICT,
  "contactHash" TEXT NOT NULL CHECK (length("contactHash") = 64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ErasedContactReference_arenaId_playerId_contactHash_key" ON "ErasedContactReference" ("arenaId", "playerId", "contactHash");
CREATE INDEX "ErasedContactReference_arenaId_contactHash_idx" ON "ErasedContactReference" ("arenaId", "contactHash");
ALTER TABLE "ErasedContactReference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ErasedContactReference" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_erased_contact_reference" ON "ErasedContactReference"
USING ("arenaId" = public.current_arena_id())
WITH CHECK ("arenaId" = public.current_arena_id() AND EXISTS (
  SELECT 1 FROM "Player" p WHERE p.id = "playerId" AND p."arenaId" = public.current_arena_id()
));
