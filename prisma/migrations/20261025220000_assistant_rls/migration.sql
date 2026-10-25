ALTER TABLE "AssistantConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssistantConversation" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_assistant_conversation" ON "AssistantConversation"
USING ("arenaId" = public.current_arena_id())
WITH CHECK ("arenaId" = public.current_arena_id());

ALTER TABLE "AssistantCommand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssistantCommand" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_assistant_command" ON "AssistantCommand"
USING ("arenaId" = public.current_arena_id())
WITH CHECK ("arenaId" = public.current_arena_id() AND EXISTS (
  SELECT 1 FROM "AssistantConversation" c WHERE c.id = "conversationId"
    AND c."arenaId" = public.current_arena_id() AND c."userId" = "requestedByUserId"
));

ALTER TABLE "AssistantMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssistantMessage" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_assistant_message" ON "AssistantMessage"
USING (EXISTS (SELECT 1 FROM "AssistantConversation" c WHERE c.id = "conversationId" AND c."arenaId" = public.current_arena_id()))
WITH CHECK (EXISTS (SELECT 1 FROM "AssistantConversation" c WHERE c.id = "conversationId" AND c."arenaId" = public.current_arena_id()));
