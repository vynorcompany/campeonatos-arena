-- Legacy plans included the teacher in Plan.name. A Plan is now a shared template;
-- the teacher and its individual price belong exclusively to TeacherPlan.
DO $$
DECLARE
  source_plan RECORD;
  canonical_plan RECORD;
  canonical_name TEXT;
BEGIN
  FOR source_plan IN
    SELECT DISTINCT ON (p."id") p."id", p."arenaId", p."name", t."name" AS teacher_name
    FROM "Plan" p
    INNER JOIN "Teacher" t ON t."arenaId" = p."arenaId"
    WHERE RIGHT(p."name", LENGTH(t."name") + 3) = ' · ' || t."name"
       OR RIGHT(p."name", LENGTH(t."name") + 3) = ' | ' || t."name"
    ORDER BY p."id", LENGTH(t."name") DESC
  LOOP
    canonical_name := CASE
      WHEN RIGHT(source_plan."name", LENGTH(source_plan.teacher_name) + 3) = ' · ' || source_plan.teacher_name
        THEN BTRIM(LEFT(source_plan."name", LENGTH(source_plan."name") - LENGTH(source_plan.teacher_name) - 3))
      ELSE BTRIM(LEFT(source_plan."name", LENGTH(source_plan."name") - LENGTH(source_plan.teacher_name) - 3))
    END;

    SELECT * INTO canonical_plan
    FROM "Plan"
    WHERE "arenaId" = source_plan."arenaId"
      AND "name" = canonical_name
      AND "id" <> source_plan."id"
    ORDER BY "createdAt" ASC
    LIMIT 1;

    IF NOT FOUND THEN
      UPDATE "Plan" SET "name" = canonical_name WHERE "id" = source_plan."id";
    ELSE
      -- Keep an existing teacher-plan price unless it is the legacy default (zero).
      UPDATE "TeacherPlan" target
      SET "monthlyPriceCents" = source."monthlyPriceCents"
      FROM "TeacherPlan" source
      WHERE source."planId" = source_plan."id"
        AND target."planId" = canonical_plan."id"
        AND target."teacherId" = source."teacherId"
        AND target."monthlyPriceCents" = 0;

      DELETE FROM "TeacherPlan" source
      USING "TeacherPlan" target
      WHERE source."planId" = source_plan."id"
        AND target."planId" = canonical_plan."id"
        AND target."teacherId" = source."teacherId";

      UPDATE "TeacherPlan"
      SET "planId" = canonical_plan."id"
      WHERE "planId" = source_plan."id";

      DELETE FROM "ClassGroupPlan" source
      USING "ClassGroupPlan" target
      WHERE source."planId" = source_plan."id"
        AND target."planId" = canonical_plan."id"
        AND target."classGroupId" = source."classGroupId";

      UPDATE "ClassGroupPlan"
      SET "planId" = canonical_plan."id"
      WHERE "planId" = source_plan."id";

      UPDATE "StudentSubscription"
      SET "planId" = canonical_plan."id"
      WHERE "planId" = source_plan."id";

      UPDATE "FinancialEntry"
      SET "planId" = canonical_plan."id"
      WHERE "planId" = source_plan."id";

      UPDATE "FinancialRecurrence"
      SET "planId" = canonical_plan."id"
      WHERE "planId" = source_plan."id";

      DELETE FROM "Plan" WHERE "id" = source_plan."id";
    END IF;
  END LOOP;
END $$;
