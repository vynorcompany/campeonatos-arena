ALTER TABLE "Player" ADD COLUMN "guardianId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Player_arenaId_id_key" ON "Player"("arenaId","id");
ALTER TABLE "Player" ADD CONSTRAINT "Player_guardian_tenant_fkey" FOREIGN KEY ("arenaId","guardianId") REFERENCES "Player"("arenaId","id") ON DELETE RESTRICT;
CREATE INDEX "Player_guardianId_idx" ON "Player"("guardianId");
ALTER TABLE "Player" ADD CONSTRAINT "Player_guardian_not_self" CHECK ("guardianId" IS NULL OR "guardianId" <> id);
ALTER TABLE "FinancialEntry" ADD COLUMN "billingPlayerId" TEXT;
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_billing_tenant_fkey" FOREIGN KEY ("arenaId","billingPlayerId") REFERENCES "Player"("arenaId","id") ON DELETE RESTRICT;
CREATE INDEX "FinancialEntry_arenaId_billingPlayerId_idx" ON "FinancialEntry"("arenaId","billingPlayerId");
CREATE FUNCTION public.assign_entry_billing_player() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."playerId" IS NOT NULL AND NEW.type IN ('REVENUE','INCOME') AND (TG_OP = 'INSERT' OR NEW."playerId" IS DISTINCT FROM OLD."playerId") THEN
  SELECT coalesce(p."guardianId",p.id) INTO NEW."billingPlayerId" FROM "Player" p WHERE p.id=NEW."playerId" AND p."arenaId"=NEW."arenaId";
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER entry_billing_player BEFORE INSERT OR UPDATE OF "playerId" ON "FinancialEntry" FOR EACH ROW EXECUTE FUNCTION public.assign_entry_billing_player();
ALTER TABLE "SponsorshipPlan" ADD COLUMN kind TEXT NOT NULL DEFAULT 'SPONSORSHIP', ADD COLUMN "dueDay" INTEGER NOT NULL DEFAULT 10, ADD COLUMN "courtId" TEXT, ADD COLUMN weekday INTEGER, ADD COLUMN "startMinute" INTEGER, ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 90;
CREATE UNIQUE INDEX IF NOT EXISTS "SponsorshipPlan_arenaId_id_key" ON "SponsorshipPlan"("arenaId",id);
CREATE UNIQUE INDEX IF NOT EXISTS "Court_arenaId_id_key" ON "Court"("arenaId",id);
ALTER TABLE "SponsorshipPlan" ADD CONSTRAINT "SponsorshipPlan_court_tenant_fkey" FOREIGN KEY ("arenaId","courtId") REFERENCES "Court"("arenaId",id) ON DELETE RESTRICT;
ALTER TABLE "SponsorshipPlan" ADD CONSTRAINT "SponsorshipPlan_valid_configuration" CHECK (kind IN ('SPONSORSHIP','FIXED_COURT') AND "dueDay" BETWEEN 1 AND 28 AND (kind <> 'FIXED_COURT' OR ("courtId" IS NOT NULL AND weekday BETWEEN 0 AND 6 AND "startMinute" BETWEEN 0 AND 1439 AND "durationMinutes" BETWEEN 15 AND 720 AND "startMinute"+"durationMinutes" <= 1440)));
ALTER TABLE "ScheduleBookingSeries" ADD COLUMN "sponsorshipPlanId" TEXT;
ALTER TABLE "ScheduleBookingSeries" ADD CONSTRAINT "ScheduleBookingSeries_plan_tenant_fkey" FOREIGN KEY ("arenaId","sponsorshipPlanId") REFERENCES "SponsorshipPlan"("arenaId",id) ON DELETE RESTRICT;
