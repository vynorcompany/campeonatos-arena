import { withArenaTransaction } from "@/lib/rls";
import { normalizeWhatsAppAccountJid } from "@/lib/whatsapp-account";
import type { EvolutionContact } from "@/lib/integrations/evolution/contacts";

export async function syncWhatsAppContactNames(arenaId: string, accountJid: string, instanceName: string, contacts: EvolutionContact[]) {
  return withArenaTransaction(arenaId, async tx => {
    const [connection] = await tx.$queryRaw<Array<{ status: string; connectedPhone: string; instanceName: string }>>`SELECT "status", "connectedPhone", "instanceName" FROM "WhatsAppConnection" WHERE "arenaId" = ${arenaId} FOR UPDATE`;
    if (connection?.status !== "CONNECTED" || normalizeWhatsAppAccountJid(connection.connectedPhone) !== accountJid || connection.instanceName !== instanceName) throw new Error("A conta do WhatsApp mudou. Atualize a página.");
    const names = new Map(contacts.filter(contact => contact.remoteJid !== accountJid).map(contact => [contact.remoteJid, contact.name]));
    const aliases = [...names.keys()].flatMap(jid => [jid, jid.replace(/@s\.whatsapp\.net$/, "@c.us")]);
    const conversations = await tx.whatsAppConversation.findMany({ where: { arenaId, accountJid, remoteJid: { in: aliases } }, select: { id: true, contactName: true, remoteJid: true } });
    let updated = 0;
    for (const conversation of conversations) {
      const name = names.get(normalizeWhatsAppAccountJid(conversation.remoteJid));
      if (!name || name === conversation.contactName) continue;
      await tx.whatsAppConversation.update({ where: { id: conversation.id }, data: { contactName: name } });
      updated++;
    }
    return updated;
  }, { timeout: 30_000 });
}
