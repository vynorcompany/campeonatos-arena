ALTER TABLE "WhatsAppConversation"
  ADD COLUMN "revision" BIGINT NOT NULL DEFAULT 0;

-- The message ETag must change for consecutive writes even when updatedAt
-- rounds to the same millisecond. Row locking serializes increments.
CREATE FUNCTION public.bump_whatsapp_conversation_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."revision" := OLD."revision" + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_conversation_revision
BEFORE UPDATE ON "WhatsAppConversation"
FOR EACH ROW EXECUTE FUNCTION public.bump_whatsapp_conversation_revision();
