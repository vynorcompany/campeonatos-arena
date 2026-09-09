-- Preserva o histórico e mantém somente uma assinatura ativa por aluno e plano.
-- Em eventuais duplicidades legadas, a mais antiga permanece ativa; as demais
-- são encerradas e ficam auditáveis na própria tabela.
WITH duplicate_subscriptions AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "studentId", "planId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS position
  FROM "StudentSubscription"
  WHERE "status" = 'ACTIVE'
)
UPDATE "StudentSubscription" subscription
SET
  "status" = 'CANCELED',
  "endedAt" = COALESCE(subscription."endedAt", NOW()),
  "notes" = CASE
    WHEN subscription."notes" = '' THEN 'Encerrada automaticamente: assinatura ativa duplicada do mesmo plano.'
    ELSE subscription."notes" || E'\nEncerrada automaticamente: assinatura ativa duplicada do mesmo plano.'
  END
FROM duplicate_subscriptions duplicate
WHERE subscription."id" = duplicate."id"
  AND duplicate.position > 1;

CREATE UNIQUE INDEX "StudentSubscription_one_active_plan_per_student"
  ON "StudentSubscription" ("studentId", "planId")
  WHERE "status" = 'ACTIVE';
