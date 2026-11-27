import { getWhatsAppWorkspace } from "@/lib/whatsapp/workspace";
import { viewStyles } from "./page.utilities";
import { WhatsAppChatWorkspace } from "@/components/whatsapp/whatsapp-chat-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { canManageWhatsApp, canSendWhatsApp } from "@/lib/permissions";

export default async function WhatsAppPage({ searchParams }: { searchParams: Promise<{ conversa?: string }> }) {
  const requestedConversation = (await searchParams).conversa?.slice(0, 100) ?? "";
  const auth = await requireModuleView("support");
  const { selectedConversationId, currentAccountJid, connected, initialVersion, slaMinutes, clients, conversations } = await getWhatsAppWorkspace(requestedConversation);
  return <div className={viewStyles.whatsapp_page}><WhatsAppChatWorkspace selectedConversationId={selectedConversationId} pollingScope={auth.arenaId} currentAccountJid={currentAccountJid} currentUserName={auth.userName} canEdit={canManageWhatsApp(auth.arenaRole, auth.systemRole, auth.editPermissions)} canSend={canSendWhatsApp(auth.arenaRole, auth.systemRole, auth.editPermissions)} connected={connected} initialVersion={initialVersion} slaMinutes={slaMinutes} clients={clients} conversations={conversations} /></div>;
}
