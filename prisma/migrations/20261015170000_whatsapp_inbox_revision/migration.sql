ALTER TABLE "WhatsAppConnection"
  ADD COLUMN "inboxRevision" BIGINT NOT NULL DEFAULT 0;

-- One arena-wide revision is reliable across conversations with equal or
-- out-of-order timestamps. The trigger also covers future conversation writes.
CREATE FUNCTION public.bump_whatsapp_inbox_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_arena_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_arena_id := OLD."arenaId";
  ELSE
    target_arena_id := NEW."arenaId";
  END IF;

  UPDATE "WhatsAppConnection"
  SET "inboxRevision" = "inboxRevision" + 1
  WHERE "arenaId" = target_arena_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER whatsapp_conversation_inbox_revision
AFTER INSERT OR UPDATE OR DELETE ON "WhatsAppConversation"
FOR EACH ROW EXECUTE FUNCTION public.bump_whatsapp_inbox_revision();
