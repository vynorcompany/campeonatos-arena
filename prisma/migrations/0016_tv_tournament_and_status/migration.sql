ALTER TABLE "TvPresentationSettings"
ADD COLUMN "selectedTournamentId" TEXT;

ALTER TABLE "TvPresentationSettings"
ALTER COLUMN "monthlyPrizeAmount" SET DEFAULT '1° - R$200 em credito da arena',
ALTER COLUMN "monthlyPrizeDescription" SET DEFAULT '2° - Um tubo de bolinha + R$50 em credito da arena | 3° - Um grip + R$25 em credito',
ALTER COLUMN "nightWinnerName" SET DEFAULT 'Super 12',
ALTER COLUMN "nightWinnerDescription" SET DEFAULT 'Ganha uma vaga cortesia para o Super 12 da proxima semana. O uso e obrigatorio na semana seguinte.';

ALTER TABLE "ManualUpcomingMatch"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'SCHEDULED';
