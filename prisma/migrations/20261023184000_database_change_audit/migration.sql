-- Transactional journal: rolled-back writes never produce committed events.
CREATE FUNCTION public.journal_database_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  previous_row jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  next_row jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE '{}'::jsonb END;
  row_data jsonb;
  arena_id text;
  changed jsonb;
  before_safe jsonb;
  after_safe jsonb;
  safe_fields text[] := ARRAY['name','title','label','status','active','amountCents','totalCents','priceCents','quantity','currency','paymentMethod','startsAt','endsAt','referenceDate','openingBalanceCents','expectedBalanceCents','countedBalanceCents'];
BEGIN
  IF TG_OP = 'UPDATE' AND previous_row = next_row THEN RETURN NEW; END IF;
  row_data := CASE WHEN TG_OP = 'DELETE' THEN previous_row ELSE next_row END;
  arena_id := CASE WHEN TG_TABLE_NAME = 'Arena' THEN row_data->>'id' ELSE row_data->>'arenaId' END;
  arena_id := coalesce(arena_id, nullif(current_setting('app.arena_id', true), ''), nullif(current_setting('app.audit_arena_id', true), ''));
  IF arena_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public."Arena" WHERE id = arena_id) THEN arena_id := NULL; END IF;
  SELECT coalesce(jsonb_agg(key ORDER BY key), '[]'::jsonb) INTO changed
  FROM (SELECT key FROM jsonb_object_keys(previous_row || next_row) key WHERE previous_row->key IS DISTINCT FROM next_row->key) fields;
  SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb) INTO before_safe FROM jsonb_each(previous_row) WHERE key = ANY(safe_fields);
  SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb) INTO after_safe FROM jsonb_each(next_row) WHERE key = ANY(safe_fields);
  INSERT INTO public."AuditEvent" (id, "arenaId", "actorId", "actorName", action, "entityId", details, "createdAt") VALUES (
    gen_random_uuid()::text, arena_id,
    coalesce(nullif(current_setting('app.audit_actor_id', true), ''), 'SYSTEM'),
    coalesce(nullif(current_setting('app.audit_actor_name', true), ''), 'Sistema'),
    'DB:' || CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END || ':' || TG_TABLE_NAME,
    coalesce(row_data->>'id', gen_random_uuid()::text),
    jsonb_build_object('source', 'DATABASE', 'model', TG_TABLE_NAME, 'operation', TG_OP,
      'requestId', nullif(current_setting('app.audit_parent_request', true), ''),
      'changedFields', changed, 'before', before_safe, 'after', after_safe), CURRENT_TIMESTAMP);
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
REVOKE ALL ON FUNCTION public.journal_database_change() FROM PUBLIC;

-- Re-run after every migration so newly added business tables receive coverage.
CREATE FUNCTION public.install_change_audit_triggers() RETURNS void
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE relation record;
BEGIN
  FOR relation IN SELECT c.oid, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relispartition
      AND c.relname NOT IN ('AuditEvent', '_prisma_migrations')
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = relation.oid AND tgname = 'journal_database_change') THEN
      EXECUTE format('CREATE TRIGGER journal_database_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.journal_database_change()', relation.relname);
    END IF;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.install_change_audit_triggers() FROM PUBLIC;
SELECT public.install_change_audit_triggers();
