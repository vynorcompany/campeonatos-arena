export const WHATSAPP_GROUP_NAME_RETRY_MS = 60_000;

export function shouldRefreshWhatsAppGroupName(
  conversation: { remoteJid: string; contactName: string },
  retryAt: number | undefined,
  now = Date.now(),
) {
  if (!conversation.remoteJid.endsWith("@g.us")) return false;
  if (retryAt === undefined) return true;
  if (retryAt > now) return false;
  const name = conversation.contactName.trim();
  return !name || name === "Grupo do WhatsApp" || name === conversation.remoteJid || /^\d+$/.test(name);
}
