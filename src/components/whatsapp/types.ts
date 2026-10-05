export type WhatsAppClient = {
  id: string;
  name: string;
  phone: string;
  email: string;
  photoUrl: string;
};

export type WhatsAppMessage = {
  id: string;
  direction: string;
  body: string;
  senderName?: string;
  quotedProviderId?: string;
  quotedBody?: string;
  quotedAuthor?: string;
  reactions?: { actorJid: string; emoji: string }[];
  mediaType: string;
  mediaMimeType: string;
  mediaUrl: string;
  sentAt: string;
};

export type WhatsAppConversation = {
  id: string;
  contactName: string;
  contactPhone: string;
  profilePhotoUrl: string;
  unreadCount: number;
  lastMessageAt: string;
  slaResolvedAt: string | null;
  playerId: string | null;
  player: WhatsAppClient | null;
  archivedAt: string | null;
  pinned: boolean;
  favorite: boolean;
  listName: string;
  remoteJid: string;
  messages: WhatsAppMessage[];
};

export type WhatsAppFilter = "all" | "unread" | "groups" | "favorite" | "archived";

export const formatWhatsAppPhone = (value: string) => {
  let digits = value.replace(/\D/g, "");
  const international = digits.startsWith("55") && (digits.length === 12 || digits.length === 13);
  if (value.trim().startsWith("+") && !international) return value;
  if (international) digits = digits.slice(2);
  if (digits.length !== 10 && digits.length !== 11) return value || "Não informado";
  return `${international ? "+55 " : ""}(${digits.slice(0, 2)}) ${digits.slice(2, -4)}-${digits.slice(-4)}`;
};

export function whatsAppConversationName(conversation: WhatsAppConversation) {
  if (conversation.remoteJid.endsWith("@g.us")) return conversation.contactName || "Grupo do WhatsApp";
  const name = conversation.player?.name || conversation.contactName;
  return name && !/^[+\d\s().-]+$/.test(name) ? name : formatWhatsAppPhone(conversation.contactPhone);
}

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "WA";
