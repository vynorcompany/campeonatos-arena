CREATE TABLE "ComandaBookingService" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "comandaId" TEXT NOT NULL REFERENCES "Comanda"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "participantId" TEXT NOT NULL REFERENCES "ScheduleParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ComandaBookingService_comandaId_participantId_key" ON "ComandaBookingService"("comandaId", "participantId");
CREATE INDEX "ComandaBookingService_participantId_idx" ON "ComandaBookingService"("participantId");
ALTER TABLE "ComandaBookingService" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComandaBookingService" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_comanda_booking_service" ON "ComandaBookingService"
USING (EXISTS (
  SELECT 1 FROM "Comanda" c, "ScheduleParticipant" p JOIN "ScheduleOccurrence" o ON o.id = p."occurrenceId"
  WHERE c.id = "ComandaBookingService"."comandaId" AND p.id = "ComandaBookingService"."participantId"
    AND c."arenaId" = public.current_arena_id() AND o."arenaId" = public.current_arena_id() AND c."playerId" = p."playerId"
)) WITH CHECK (EXISTS (
  SELECT 1 FROM "Comanda" c, "ScheduleParticipant" p JOIN "ScheduleOccurrence" o ON o.id = p."occurrenceId"
  WHERE c.id = "ComandaBookingService"."comandaId" AND p.id = "ComandaBookingService"."participantId"
    AND c."arenaId" = public.current_arena_id() AND o."arenaId" = public.current_arena_id() AND c."playerId" = p."playerId"
));
GRANT SELECT, INSERT, UPDATE, DELETE ON "ComandaBookingService" TO arena_runtime;
