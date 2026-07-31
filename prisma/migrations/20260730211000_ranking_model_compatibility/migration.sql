-- A single ranking cannot represent incompatible category result tables.
DO $$
BEGIN
  IF EXISTS (
    SELECT competition."rankingId"
    FROM "CategoryCompetition" AS competition
    WHERE competition."rankingId" IS NOT NULL
    GROUP BY competition."rankingId"
    HAVING
      BOOL_OR(competition."format" = 'LEAGUE')
      AND BOOL_OR(competition."format" <> 'LEAGUE')
  ) THEN
    RAISE EXCEPTION
      'Cannot backfill ranking models: one ranking is linked to both LEAGUE and KNOCKOUT category formats.';
  END IF;
END
$$;

-- Legacy Tournament scoring is always knockout-based. Refuse an ambiguous
-- historical link instead of silently choosing a model that breaks one side.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "RankingProfile" AS ranking
    WHERE EXISTS (
      SELECT 1
      FROM "CategoryCompetition" AS competition
      WHERE competition."rankingId" = ranking."id"
        AND competition."format" = 'LEAGUE'
    )
    AND EXISTS (
      SELECT 1
      FROM "Tournament" AS tournament
      WHERE tournament."rankingId" = ranking."id"
    )
  ) THEN
    RAISE EXCEPTION
      'A LEAGUE ranking cannot also serve a legacy tournament, which requires KNOCKOUT scoring.';
  END IF;
END
$$;

-- Rankings used exclusively by League categories inherit the League model.
UPDATE "RankingProfile" AS ranking
SET "model" = 'LEAGUE'
WHERE EXISTS (
  SELECT 1
  FROM "CategoryCompetition" AS competition
  WHERE competition."rankingId" = ranking."id"
    AND competition."format" = 'LEAGUE'
)
AND NOT EXISTS (
  SELECT 1
  FROM "CategoryCompetition" AS competition
  WHERE competition."rankingId" = ranking."id"
    AND competition."format" <> 'LEAGUE'
)
AND NOT EXISTS (
  SELECT 1
  FROM "Tournament" AS tournament
  WHERE tournament."rankingId" = ranking."id"
);

-- Preserve the closest historical value for third place. Before the model
-- existed, the semifinal value was the equivalent configurable placement.
INSERT INTO "RankingRule" (
  "id",
  "stageKey",
  "label",
  "points",
  "displayOrder",
  "createdAt",
  "updatedAt",
  "rankingId"
)
SELECT
  CONCAT(ranking."id", '-league-third'),
  'THIRD',
  '3º lugar',
  COALESCE(
    (
      SELECT semifinal."points"
      FROM "RankingRule" AS semifinal
      WHERE semifinal."rankingId" = ranking."id"
        AND semifinal."stageKey" = 'SEMIFINAL'
    ),
    (
      SELECT participation."points"
      FROM "RankingRule" AS participation
      WHERE participation."rankingId" = ranking."id"
        AND participation."stageKey" = 'PARTICIPATION'
    ),
    0
  ),
  3,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  ranking."id"
FROM "RankingProfile" AS ranking
WHERE ranking."model" = 'LEAGUE'
ON CONFLICT ("rankingId", "stageKey") DO UPDATE
SET
  "label" = EXCLUDED."label",
  "points" = EXCLUDED."points",
  "displayOrder" = EXCLUDED."displayOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "RankingRule" AS rule
SET "displayOrder" = 4
WHERE rule."stageKey" = 'PARTICIPATION'
AND EXISTS (
  SELECT 1
  FROM "RankingProfile" AS ranking
  WHERE ranking."id" = rule."rankingId"
    AND ranking."model" = 'LEAGUE'
);

DELETE FROM "RankingRule" AS rule
WHERE rule."stageKey" IN ('SEMIFINAL', 'QUARTERFINAL')
AND EXISTS (
  SELECT 1
  FROM "RankingProfile" AS ranking
  WHERE ranking."id" = rule."rankingId"
    AND ranking."model" = 'LEAGUE'
);
