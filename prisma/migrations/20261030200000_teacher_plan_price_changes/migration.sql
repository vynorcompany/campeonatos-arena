CREATE TABLE "PlanPriceChange" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "arenaId" TEXT NOT NULL,
  "teacherPlanId" TEXT NOT NULL REFERENCES "TeacherPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "amountCents" INTEGER NOT NULL CHECK ("amountCents" >= 0),
  "effectiveDate" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL
);
CREATE UNIQUE INDEX "PlanPriceChange_teacherPlanId_effectiveDate_key" ON "PlanPriceChange"("teacherPlanId", "effectiveDate");
CREATE INDEX "PlanPriceChange_arenaId_status_effectiveDate_idx" ON "PlanPriceChange"("arenaId", "status", "effectiveDate");
ALTER TABLE "PlanPriceChange" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanPriceChange" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "PlanPriceChange" TO arena_runtime;
CREATE POLICY "arena_scope_planpricechange" ON "PlanPriceChange"
USING ("arenaId" = public.current_arena_id())
WITH CHECK ("arenaId" = public.current_arena_id() AND EXISTS (SELECT 1 FROM "TeacherPlan" p WHERE p.id = "PlanPriceChange"."teacherPlanId" AND p."arenaId" = public.current_arena_id()));
