/** Every newly stored message must advance the inbox version, even when its sentAt is older. */
export function nextWhatsAppConversationVersion(previous: Date, now = new Date()) {
  return new Date(Math.max(previous.getTime() + 1, now.getTime()));
}
