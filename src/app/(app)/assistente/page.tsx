import { viewStyles } from "./page.utilities";
import { ArenaAssistantChat } from "@/components/assistant/arena-assistant-chat";
import { requireRole } from "@/lib/auth/guards";
import { getAssistantHistory } from "@/lib/assistant/history-data";

export default async function ArenaAssistantPage() {
  const auth = await requireRole("ADMIN");
  const {messages} = await getAssistantHistory(auth.arenaId,auth.userId);

  return <div className={viewStyles.workspace_page_assistant_page}>
    <nav className={viewStyles.page_breadcrumb} aria-label="Caminho de navegação"><span>Administração</span><i aria-hidden="true">›</i><strong>Assistente</strong></nav>
    <h1 className="tw:sr-only">Assistente da Arena</h1>
    <ArenaAssistantChat initialMessages={messages} />
  </div>;
}
