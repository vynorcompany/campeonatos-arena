CREATE TABLE "ComandaWhatsappDelivery" (
  "id" TEXT PRIMARY KEY,
  "arenaId" TEXT NOT NULL REFERENCES "Arena"("id") ON DELETE CASCADE,
  "comandaId" TEXT NOT NULL REFERENCES "Comanda"("id") ON DELETE CASCADE,
  "playerId" TEXT NOT NULL,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('PAID', 'UNPAID')),
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'SENDING', 'SENT', 'UNKNOWN', 'SKIPPED')),
  "message" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ComandaWhatsappDelivery_comandaId_playerId_kind_key" ON "ComandaWhatsappDelivery" ("comandaId", "playerId", "kind");
CREATE INDEX "ComandaWhatsappDelivery_arenaId_status_createdAt_idx" ON "ComandaWhatsappDelivery" ("arenaId", "status", "createdAt");
ALTER TABLE "ComandaWhatsappDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComandaWhatsappDelivery" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_comanda_whatsapp" ON "ComandaWhatsappDelivery"
USING ("arenaId" = public.current_arena_id())
WITH CHECK ("arenaId" = public.current_arena_id()
  AND EXISTS (SELECT 1 FROM "Comanda" c WHERE c.id = "comandaId" AND c."arenaId" = public.current_arena_id())
  AND EXISTS (SELECT 1 FROM "Player" p WHERE p.id = "playerId" AND p."arenaId" = public.current_arena_id()));
