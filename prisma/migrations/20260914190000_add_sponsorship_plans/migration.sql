CREATE TABLE "SponsorshipPlan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sponsorshipType" TEXT NOT NULL DEFAULT 'Mensal',
  "monthlyAmountCents" INTEGER NOT NULL DEFAULT 0,
  "reservationCredits" INTEGER NOT NULL DEFAULT 0,
  "lessonCredits" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "SponsorshipPlan_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TvSponsor" ADD COLUMN "sponsorshipPlanId" TEXT;

CREATE UNIQUE INDEX "SponsorshipPlan_arenaId_name_key" ON "SponsorshipPlan"("arenaId", "name");
CREATE INDEX "SponsorshipPlan_arenaId_createdAt_idx" ON "SponsorshipPlan"("arenaId", "createdAt");
CREATE INDEX "TvSponsor_sponsorshipPlanId_idx" ON "TvSponsor"("sponsorshipPlanId");

ALTER TABLE "SponsorshipPlan" ADD CONSTRAINT "SponsorshipPlan_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TvSponsor" ADD CONSTRAINT "TvSponsor_sponsorshipPlanId_fkey" FOREIGN KEY ("sponsorshipPlanId") REFERENCES "SponsorshipPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
