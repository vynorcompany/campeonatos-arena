CREATE TABLE "FiscalDocument" (
  "id" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'INCOMING',
  "status" TEXT NOT NULL DEFAULT 'IMPORTED',
  "documentType" TEXT NOT NULL DEFAULT 'NFE',
  "accessKey" TEXT NOT NULL,
  "number" TEXT NOT NULL DEFAULT '',
  "series" TEXT NOT NULL DEFAULT '',
  "supplierName" TEXT NOT NULL DEFAULT '',
  "supplierDocument" TEXT NOT NULL DEFAULT '',
  "issuedAt" TIMESTAMP(3),
  "totalCents" INTEGER NOT NULL DEFAULT 0,
  "xmlDigest" TEXT NOT NULL DEFAULT '',
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "FiscalDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FiscalDocumentItem" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL DEFAULT '',
  "barcode" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL,
  "ncm" TEXT NOT NULL DEFAULT '',
  "cfop" TEXT NOT NULL DEFAULT '',
  "unit" TEXT NOT NULL DEFAULT '',
  "quantity" INTEGER NOT NULL,
  "unitCostCents" INTEGER NOT NULL DEFAULT 0,
  "totalCents" INTEGER NOT NULL DEFAULT 0,
  "fiscalDocumentId" TEXT NOT NULL,
  "productId" TEXT,
  CONSTRAINT "FiscalDocumentItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FiscalDocument_arenaId_accessKey_key" ON "FiscalDocument"("arenaId", "accessKey");
CREATE INDEX "FiscalDocument_arenaId_direction_issuedAt_idx" ON "FiscalDocument"("arenaId", "direction", "issuedAt");
CREATE INDEX "FiscalDocument_arenaId_importedAt_idx" ON "FiscalDocument"("arenaId", "importedAt");
CREATE INDEX "FiscalDocumentItem_fiscalDocumentId_idx" ON "FiscalDocumentItem"("fiscalDocumentId");
CREATE INDEX "FiscalDocumentItem_productId_idx" ON "FiscalDocumentItem"("productId");

ALTER TABLE "FiscalDocument" ADD CONSTRAINT "FiscalDocument_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FiscalDocumentItem" ADD CONSTRAINT "FiscalDocumentItem_fiscalDocumentId_fkey" FOREIGN KEY ("fiscalDocumentId") REFERENCES "FiscalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FiscalDocumentItem" ADD CONSTRAINT "FiscalDocumentItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
