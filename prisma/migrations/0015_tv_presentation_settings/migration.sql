CREATE TABLE "TvPresentationSettings" (
    "id" TEXT NOT NULL,
    "slideIntervalSeconds" INTEGER NOT NULL DEFAULT 12,
    "showSponsors" BOOLEAN NOT NULL DEFAULT false,
    "showRanking" BOOLEAN NOT NULL DEFAULT false,
    "showMonthlyPrize" BOOLEAN NOT NULL DEFAULT false,
    "showNightWinner" BOOLEAN NOT NULL DEFAULT false,
    "monthlyPrizeTitle" TEXT NOT NULL DEFAULT 'Premiacao mensal',
    "monthlyPrizeAmount" TEXT NOT NULL DEFAULT '',
    "monthlyPrizeDescription" TEXT NOT NULL DEFAULT '',
    "nightWinnerTitle" TEXT NOT NULL DEFAULT 'Vencedor da noite',
    "nightWinnerName" TEXT NOT NULL DEFAULT '',
    "nightWinnerDescription" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "arenaId" TEXT NOT NULL,

    CONSTRAINT "TvPresentationSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TvSponsor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "displayOrder" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "arenaId" TEXT NOT NULL,

    CONSTRAINT "TvSponsor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TvPresentationSettings_arenaId_key" ON "TvPresentationSettings"("arenaId");
CREATE INDEX "TvSponsor_arenaId_displayOrder_idx" ON "TvSponsor"("arenaId", "displayOrder");

ALTER TABLE "TvPresentationSettings" ADD CONSTRAINT "TvPresentationSettings_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TvSponsor" ADD CONSTRAINT "TvSponsor_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
