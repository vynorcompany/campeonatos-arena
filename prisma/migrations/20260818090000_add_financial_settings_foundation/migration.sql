CREATE TABLE "FinancialCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'BOTH',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "FinancialCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentMethodSetting" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "PaymentMethodSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BankAccount" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "bankName" TEXT NOT NULL DEFAULT '',
  "openingBalanceCents" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Supplier" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "document" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "arenaId" TEXT NOT NULL,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialCategory_arenaId_name_key" ON "FinancialCategory"("arenaId", "name");
CREATE INDEX "FinancialCategory_arenaId_active_idx" ON "FinancialCategory"("arenaId", "active");
CREATE UNIQUE INDEX "PaymentMethodSetting_arenaId_name_key" ON "PaymentMethodSetting"("arenaId", "name");
CREATE INDEX "PaymentMethodSetting_arenaId_active_idx" ON "PaymentMethodSetting"("arenaId", "active");
CREATE UNIQUE INDEX "BankAccount_arenaId_name_key" ON "BankAccount"("arenaId", "name");
CREATE INDEX "BankAccount_arenaId_active_idx" ON "BankAccount"("arenaId", "active");
CREATE UNIQUE INDEX "Supplier_arenaId_name_key" ON "Supplier"("arenaId", "name");
CREATE INDEX "Supplier_arenaId_active_idx" ON "Supplier"("arenaId", "active");

ALTER TABLE "FinancialCategory" ADD CONSTRAINT "FinancialCategory_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentMethodSetting" ADD CONSTRAINT "PaymentMethodSetting_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;
