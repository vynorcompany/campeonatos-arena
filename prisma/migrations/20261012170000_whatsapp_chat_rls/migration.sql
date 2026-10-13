-- Conversas e mensagens carregam dados privados da conta conectada. O papel
-- de execução só pode acessá-los dentro da arena definida na transação.
ALTER TABLE "WhatsAppConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WhatsAppConversation" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_whatsapp_conversation" ON "WhatsAppConversation"
  USING ("arenaId" = public.current_arena_id())
  WITH CHECK ("arenaId" = public.current_arena_id());

ALTER TABLE "WhatsAppMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WhatsAppMessage" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_whatsapp_message" ON "WhatsAppMessage"
  USING (EXISTS (
    SELECT 1 FROM "WhatsAppConversation" c
    WHERE c.id = "WhatsAppMessage"."conversationId"
      AND c."arenaId" = public.current_arena_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "WhatsAppConversation" c
    WHERE c.id = "WhatsAppMessage"."conversationId"
      AND c."arenaId" = public.current_arena_id()
  ));
