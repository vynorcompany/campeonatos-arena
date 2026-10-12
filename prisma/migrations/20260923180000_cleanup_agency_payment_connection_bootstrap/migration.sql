-- Only remove the temporary table created by the fresh-install bootstrap.
-- An existing agency payment connection (including its data) is untouched.
DO $$
BEGIN
  IF to_regclass('"_ArenaAgencyPaymentConnectionBootstrap"') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM "AgencyPaymentConnection") THEN
      RAISE EXCEPTION 'Refusing to discard rows from the temporary AgencyPaymentConnection table';
    END IF;

    DROP TABLE "AgencyPaymentConnection";
    DROP TABLE "_ArenaAgencyPaymentConnectionBootstrap";
  END IF;
END $$;
