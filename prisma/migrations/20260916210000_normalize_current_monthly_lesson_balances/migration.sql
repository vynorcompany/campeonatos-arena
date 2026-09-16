-- Teacher adjustments are limited to the plan allowance. Normalize any
-- current-cycle rows produced before that rule so the UI and stored balance
-- agree immediately; historical cycles remain untouched.
WITH active_subscriptions AS (
  SELECT DISTINCT ON ("studentId") "studentId", "classesPerMonth"
  FROM "StudentSubscription"
  WHERE "status" = 'ACTIVE'
  ORDER BY "studentId", "startedAt" DESC
), normalized AS (
  UPDATE "StudentMonthlyBalance" AS balance
  SET
    "totalClasses" = subscription."classesPerMonth",
    "remainingClasses" = LEAST(balance."remainingClasses", subscription."classesPerMonth")
  FROM active_subscriptions AS subscription
  WHERE balance."studentId" = subscription."studentId"
    AND balance."referenceMonth" = to_char(CURRENT_DATE, 'YYYY-MM')
  RETURNING balance."studentId", balance."remainingClasses"
)
UPDATE "Student" AS student
SET "remainingClasses" = normalized."remainingClasses"
FROM normalized
WHERE student."id" = normalized."studentId";
