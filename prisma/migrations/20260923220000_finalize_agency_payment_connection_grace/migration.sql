-- Restore the grace-period column after the complete agency table is created.
-- This is a no-op on databases where the historical migration already ran.
ALTER TABLE "AgencyPaymentConnection" ADD COLUMN IF NOT EXISTS "graceDays" INTEGER;
