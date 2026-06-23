-- CreateTable
CREATE TABLE "RegulationDocument" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "publicSlug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "arenaId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "RegulationDocument_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "RegulationAcceptance" ADD COLUMN "regulationDocumentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RegulationDocument_publicSlug_key" ON "RegulationDocument"("publicSlug");

-- CreateIndex
CREATE INDEX "RegulationDocument_arenaId_active_idx" ON "RegulationDocument"("arenaId", "active");

-- CreateIndex
CREATE INDEX "RegulationDocument_arenaId_createdAt_idx" ON "RegulationDocument"("arenaId", "createdAt");

-- CreateIndex
CREATE INDEX "RegulationAcceptance_regulationDocumentId_idx" ON "RegulationAcceptance"("regulationDocumentId");

-- AddForeignKey
ALTER TABLE "RegulationDocument" ADD CONSTRAINT "RegulationDocument_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulationDocument" ADD CONSTRAINT "RegulationDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulationAcceptance" ADD CONSTRAINT "RegulationAcceptance_regulationDocumentId_fkey" FOREIGN KEY ("regulationDocumentId") REFERENCES "RegulationDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
