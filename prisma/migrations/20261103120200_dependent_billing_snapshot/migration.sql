CREATE OR REPLACE FUNCTION public.assign_entry_billing_player() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."playerId" IS NOT NULL AND NEW.type IN ('REVENUE','INCOME') AND (TG_OP = 'INSERT' OR NEW."playerId" IS DISTINCT FROM OLD."playerId") THEN
  SELECT p."guardianId" INTO NEW."billingPlayerId" FROM "Player" p WHERE p.id=NEW."playerId" AND p."arenaId"=NEW."arenaId";
 END IF;
 RETURN NEW;
END $$;
