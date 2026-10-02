export const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏", "😀", "🥳", "😍", "😎", "🎾", "🔥"] as const;
export type WhatsAppReaction = { actorJid: string; emoji: string };

export function readWhatsAppReactions(value: unknown): WhatsAppReaction[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is WhatsAppReaction => Boolean(item && typeof item === "object" && typeof item.actorJid === "string" && typeof item.emoji === "string" && item.emoji));
}

export function withWhatsAppReaction(value: unknown, actorJid: string, emoji: string) {
  const reactions = readWhatsAppReactions(value).filter((item) => item.actorJid !== actorJid);
  if (emoji) reactions.push({ actorJid, emoji });
  return reactions;
}
