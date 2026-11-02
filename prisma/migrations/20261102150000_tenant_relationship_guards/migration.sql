-- Reinforce private tenant relationships without modifying any customer records.
-- Existing single-column FK actions remain authoritative for deletion/SET NULL.
-- Nullable/global parent arenas are deliberately outside this private-tenant rule.
SET lock_timeout = '5s';
SET statement_timeout = '120s';
DO $guards$
DECLARE link record; parent_key text; guard_name text; mismatches bigint;
BEGIN
 FOR link IN
   SELECT child.relname AS child_table, parent.relname AS parent_table,
          child_col.attname AS child_column, parent_col.attname AS parent_column
   FROM pg_constraint fk
   JOIN pg_class child ON child.oid=fk.conrelid
   JOIN pg_class parent ON parent.oid=fk.confrelid
   JOIN pg_namespace ns ON ns.oid=child.relnamespace
   JOIN pg_attribute child_col ON child_col.attrelid=child.oid AND child_col.attnum=fk.conkey[1]
   JOIN pg_attribute parent_col ON parent_col.attrelid=parent.oid AND parent_col.attnum=fk.confkey[1]
   JOIN pg_attribute ca ON ca.attrelid=child.oid AND ca.attname='arenaId' AND NOT ca.attisdropped
   JOIN pg_attribute pa ON pa.attrelid=parent.oid AND pa.attname='arenaId' AND pa.attnotnull AND NOT pa.attisdropped
   WHERE ns.nspname='public' AND fk.contype='f' AND cardinality(fk.conkey)=1
     AND child_col.attname<>'arenaId'
   ORDER BY child.relname,child_col.attname
 LOOP
   EXECUTE format('SELECT count(*) FROM public.%I c JOIN public.%I p ON c.%I=p.%I WHERE c."arenaId" IS NOT NULL AND c."arenaId" IS DISTINCT FROM p."arenaId"',link.child_table,link.parent_table,link.child_column,link.parent_column) INTO mismatches;
   IF mismatches>0 THEN RAISE EXCEPTION 'Tenant relationship mismatch: %.% -> % (% rows). No records were changed.',link.child_table,link.child_column,link.parent_table,mismatches; END IF;
   parent_key := 'tenant_parent_' || md5(link.parent_table || ':' || link.parent_column);
   guard_name := 'tenant_link_' || md5(link.child_table || ':' || link.child_column || ':' || link.parent_table);
   EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (%I,"arenaId")',parent_key,link.parent_table,link.parent_column);
   IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname=guard_name AND conrelid=format('public.%I',link.child_table)::regclass) THEN
     EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I,"arenaId") REFERENCES public.%I (%I,"arenaId") ON UPDATE CASCADE ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED',link.child_table,guard_name,link.child_column,link.parent_table,link.parent_column);
   END IF;
 END LOOP;
END $guards$;
RESET lock_timeout;
RESET statement_timeout;
