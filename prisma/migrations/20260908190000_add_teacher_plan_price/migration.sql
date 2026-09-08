-- A plan is a shared template. Each teacher can charge a different monthly price.
ALTER TABLE "TeacherPlan" ADD COLUMN "monthlyPriceCents" INTEGER NOT NULL DEFAULT 0;

UPDATE "TeacherPlan"
SET "monthlyPriceCents" = "Plan"."monthlyPriceCents"
FROM "Plan"
WHERE "TeacherPlan"."planId" = "Plan"."id";
