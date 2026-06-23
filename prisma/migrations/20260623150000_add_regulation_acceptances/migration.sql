-- CreateTable
CREATE TABLE "RegulationAcceptance" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arenaId" TEXT NOT NULL,
    "acceptedById" TEXT,

    CONSTRAINT "RegulationAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegulationAcceptance_arenaId_acceptedAt_idx" ON "RegulationAcceptance"("arenaId", "acceptedAt");

-- CreateIndex
CREATE INDEX "RegulationAcceptance_acceptedById_idx" ON "RegulationAcceptance"("acceptedById");

-- AddForeignKey
ALTER TABLE "RegulationAcceptance" ADD CONSTRAINT "RegulationAcceptance_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulationAcceptance" ADD CONSTRAINT "RegulationAcceptance_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
