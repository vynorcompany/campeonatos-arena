import { viewStyles } from "./page.utilities";
import { ArenaAssistantChat } from "@/components/assistant/arena-assistant-chat";
import { requireRole } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";

export default async function ArenaAssistantPage() {
  const auth = await requireRole("ADMIN");
  const conversation = await arenaDatabase(auth.arenaId).assistantConversation.findUnique({
    where: { arenaId_userId: { arenaId: auth.arenaId, userId: auth.userId } },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 80 } }
  });
  const messages = conversation?.messages.map((message) => ({ ...message, createdAt: message.createdAt.toISOString() })) ?? [];

  return <div className={viewStyles.workspace_page_assistant_page}>
    <nav className={viewStyles.page_breadcrumb} aria-label="Caminho de navegação"><span>Administração</span><i aria-hidden="true">›</i><strong>Assistente</strong></nav>
    <h1 className="tw:sr-only">Assistente da Arena</h1>
    <ArenaAssistantChat initialMessages={messages} />
  </div>;
}
