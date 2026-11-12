ALTER TABLE "Player" ADD COLUMN "personType" TEXT NOT NULL DEFAULT 'PF', ADD COLUMN "cnpj" TEXT NOT NULL DEFAULT '', ADD COLUMN "allowOverdueComandas" BOOLEAN;
ALTER TABLE "Player" ADD CONSTRAINT "Player_personType_check" CHECK ("personType" IN ('PF', 'PJ'));
