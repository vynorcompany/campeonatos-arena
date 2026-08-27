import { ArenaAssistantChat } from "@/components/assistant/arena-assistant-chat";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function ArenaAssistantPage() {
  const auth = await requireRole("ADMIN");
  const conversation = await prisma.assistantConversation.findUnique({
    where: { arenaId_userId: { arenaId: auth.arenaId, userId: auth.userId } },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 80 } }
  });
  const messages = conversation?.messages.map((message) => ({ ...message, createdAt: message.createdAt.toISOString() })) ?? [];

  return <div className="workspace-page assistant-page">
    <header className="page-header">
      <div><p className="eyebrow">Administração</p><h1>Assistente da Arena</h1><p>Comandos ficam registrados e são executados somente dentro do catálogo autorizado.</p></div>
    </header>
    <ArenaAssistantChat initialMessages={messages} />
  </div>;
}
