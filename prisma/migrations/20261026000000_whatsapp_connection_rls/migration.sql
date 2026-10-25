ALTER TABLE "WhatsAppConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WhatsAppConnection" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_whatsapp_connection" ON "WhatsAppConnection"
USING ("arenaId" = public.current_arena_id())
WITH CHECK ("arenaId" = public.current_arena_id());

-- Resolve only routing metadata before authenticating the inbound callback.
-- Encrypted credentials, webhook hashes, QR codes and account phones stay scoped.
CREATE FUNCTION public.resolve_whatsapp_arena(instance_name TEXT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT c."arenaId" FROM public."WhatsAppConnection" c
  WHERE c."instanceName" = instance_name AND length(instance_name) BETWEEN 1 AND 200
$$;
REVOKE ALL ON FUNCTION public.resolve_whatsapp_arena(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_whatsapp_arena(TEXT) TO arena_runtime;
