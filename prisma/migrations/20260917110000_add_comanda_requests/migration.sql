CREATE TABLE "ComandaRequest" (
  "id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "comandaId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  CONSTRAINT "ComandaRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ComandaRequest_comandaId_status_createdAt_idx" ON "ComandaRequest"("comandaId", "status", "createdAt");
CREATE INDEX "ComandaRequest_productId_idx" ON "ComandaRequest"("productId");
ALTER TABLE "ComandaRequest" ADD CONSTRAINT "ComandaRequest_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComandaRequest" ADD CONSTRAINT "ComandaRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
