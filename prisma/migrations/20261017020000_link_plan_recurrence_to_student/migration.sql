ALTER TABLE "FinancialRecurrence" ADD COLUMN "studentId" TEXT;

UPDATE "FinancialRecurrence" AS recurrence
SET "studentId" = student."id"
FROM "StudentSubscription" AS subscription
JOIN "Student" AS student ON student."id" = subscription."studentId"
WHERE recurrence."arenaId" = subscription."arenaId"
  AND recurrence."planId" = subscription."planId"
  AND recurrence."startsAt" = subscription."startedAt"
  AND recurrence."counterpartyName" = student."name"
  AND recurrence."category" = 'Planos de aulas'
  AND recurrence."playerId" IS NOT DISTINCT FROM student."playerId"
  AND (
    recurrence."notes" LIKE 'Gerado pelo plano do professor.%'
    OR recurrence."notes" IN ('Ativação do plano de aulas.', 'Renovação anual do plano de aulas.')
  );

CREATE INDEX "FinancialRecurrence_arenaId_studentId_planId_active_idx"
  ON "FinancialRecurrence"("arenaId", "studentId", "planId", "active");

ALTER TABLE "FinancialRecurrence" ADD CONSTRAINT "FinancialRecurrence_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
