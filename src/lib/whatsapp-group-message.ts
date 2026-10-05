type GroupMessage = { direction: string; body: string; senderName?: string; participantJid?: string };

/** Older inbound group messages stored the participant prefix in the body. */
export function groupMessageContent(message: GroupMessage) {
  if (message.direction !== "INBOUND") return { name: message.senderName || "", body: message.body };
  if (message.senderName) return { name: message.senderName, body: message.body };
  if (message.participantJid) {
    const separator = message.body.indexOf(": ");
    if (separator > 0 && separator <= 100 && !message.body.slice(0, separator).includes("\n")) {
      return { name: message.body.slice(0, separator), body: message.body.slice(separator + 2) };
    }
  }
  return { name: message.participantJid?.split("@")[0] || "Participante", body: message.body };
}

const participantColors = ["tw:text-[#087f8c]", "tw:text-[#9c3564]", "tw:text-[#6750a4]", "tw:text-[#a45b08]", "tw:text-[#14734b]", "tw:text-[#385dab]"];
export function groupParticipantColor(identity: string) {
  let hash = 0;
  for (const character of identity) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return participantColors[hash % participantColors.length];
}

export function whatsAppSlaStatus(conversation: { remoteJid: string; slaResolvedAt: string | null }, last: { direction: string; sentAt: string } | undefined, minutes: number, now = Date.now()) {
  if (conversation.remoteJid.endsWith("@g.us") || last?.direction !== "INBOUND" || (conversation.slaResolvedAt && new Date(conversation.slaResolvedAt).getTime() >= new Date(last.sentAt).getTime())) return "normal";
  const elapsed = (now - new Date(last.sentAt).getTime()) / 60_000;
  return elapsed >= minutes ? "overdue" : elapsed >= minutes * .8 ? "warning" : "normal";
}
