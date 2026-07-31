ALTER TABLE "RankingProfile"
ADD COLUMN "feedsGeneralRanking" BOOLEAN NOT NULL DEFAULT false;

UPDATE "RankingProfile" AS ranking
SET "feedsGeneralRanking" = true
WHERE EXISTS (
  SELECT 1
  FROM "CategoryCompetition" AS competition
  INNER JOIN "TournamentCategory" AS category
    ON category.id = competition."categoryId"
  WHERE competition."rankingId" = ranking.id
    AND category.active = true
)
AND NOT EXISTS (
  SELECT 1
  FROM "CategoryCompetition" AS competition
  INNER JOIN "TournamentCategory" AS category
    ON category.id = competition."categoryId"
  WHERE competition."rankingId" = ranking.id
    AND category.active = true
    AND competition."feedsGeneralRanking" = false
);
