-- The historical grace-period migration precedes the migration that creates this
-- table. On a fresh database, provide a temporary table for that migration
-- without changing the checksum of a migration already applied in production.
DO $$
BEGIN
  IF to_regclass('"AgencyPaymentConnection"') IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM "_prisma_migrations"
      WHERE migration_name = '20260923150000_agency_billing_grace_days'
        AND finished_at IS NOT NULL
        AND rolled_back_at IS NULL
    ) THEN
      RAISE EXCEPTION 'AgencyPaymentConnection is missing despite the grace-period migration being applied';
    END IF;

    CREATE TABLE "_ArenaAgencyPaymentConnectionBootstrap" ("id" INTEGER PRIMARY KEY);
    CREATE TABLE "AgencyPaymentConnection" ("id" TEXT NOT NULL PRIMARY KEY);
  END IF;
END $$;
