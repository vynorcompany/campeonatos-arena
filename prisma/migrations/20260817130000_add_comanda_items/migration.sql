CREATE TABLE "ComandaItem" (
  "id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPriceCents" INTEGER NOT NULL,
  "totalCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "comandaId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  CONSTRAINT "ComandaItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ComandaItem_comandaId_productId_key" ON "ComandaItem"("comandaId", "productId");
CREATE INDEX "ComandaItem_productId_idx" ON "ComandaItem"("productId");

ALTER TABLE "ComandaItem" ADD CONSTRAINT "ComandaItem_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComandaItem" ADD CONSTRAINT "ComandaItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
