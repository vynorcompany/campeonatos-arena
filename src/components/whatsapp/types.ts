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
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? `(${digits.slice(-11, -9)}) ${digits.slice(-9, -4)}-${digits.slice(-4)}` : value || "Não informado";
};

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "WA";
