ALTER TABLE "ComandaItem" ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SaleItem" ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ComandaItem" ADD CONSTRAINT "ComandaItem_discount_nonnegative" CHECK ("discountCents" >= 0);
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_discount_nonnegative" CHECK ("discountCents" >= 0);
SELECT install_change_audit_triggers();
