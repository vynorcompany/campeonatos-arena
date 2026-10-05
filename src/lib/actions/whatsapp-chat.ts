"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit, requireModuleView } from "@/lib/auth/guards";
import { getEvolutionGroupName, getEvolutionProfilePicture, sendEvolutionAudioMessage, sendEvolutionMediaMessage, sendEvolutionTextMessage, sendEvolutionReaction, type EvolutionQuotedMessage } from "@/lib/integrations/evolution/client";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { getActiveWhatsAppAccountJid } from "@/lib/whatsapp-active-account";
import { getArenaWhatsAppConversation, getEvolutionProviderId, persistOutboundWhatsAppMessage, persistWhatsAppReaction } from "@/lib/services/whatsapp-conversation";
import { groupMessageContent } from "@/lib/whatsapp-group-message";
import { reactionEmojis } from "@/lib/whatsapp-message-data";

const sendSchema = z.object({ conversationId: z.string().min(1), body: z.string().trim().min(1, "Escreva uma mensagem.").max(4096, "A mensagem é muito longa.") });
const readSchema = z.object({ conversationId: z.string().min(1) });
const linkSchema = z.object({ conversationId: z.string().min(1), playerId: z.string().min(1) });
const slaSchema = z.object({ minutes: z.coerce.number().int().min(5, "O SLA mínimo é de 5 minutos.").max(1_440, "O SLA máximo é de 24 horas.") });
const conversationActionSchema = z.object({ conversationId: z.string().min(1), action: z.enum(["archive", "pin", "unread", "favorite", "list", "clear", "delete", "resolve_sla"]), listName: z.string().trim().max(80).optional() });
const contactSchema = z.object({ name: z.string().trim().min(3, "Informe o nome do contato."), phone: z.string().trim().min(8, "Informe o telefone do contato.") });

async function activeConversationScope(arenaId: string, conversationId: string) {
  const accountJid = await getActiveWhatsAppAccountJid(arenaId);
  if (!accountJid) throw new Error("O WhatsApp da arena não está conectado.");
  return { id: conversationId, arenaId, accountJid };
}

async function replyContext(arenaId: string, conversationId: string, formData: FormData) {
  const replyToId = String(formData.get("replyToId") ?? "");
  if (!replyToId) return { quoted: undefined, metadata: {} };
  const scope = await activeConversationScope(arenaId, conversationId);
  const target = await prisma.whatsAppMessage.findFirst({ where: { id: replyToId, conversation: scope }, include: { conversation: { select: { remoteJid: true, contactName: true } } } });
  if (!target) throw new Error("A mensagem respondida não pertence a esta conversa.");
  const quoted: EvolutionQuotedMessage = {
    key: { id: target.providerId, remoteJid: target.conversation.remoteJid, fromMe: target.direction === "OUTBOUND", ...(target.participantJid ? { participant: target.participantJid } : {}) },
    message: target.providerPayload && typeof target.providerPayload === "object" && !Array.isArray(target.providerPayload) ? target.providerPayload as Record<string, unknown> : { conversation: target.body },
  };
  const content = target.conversation.remoteJid.endsWith("@g.us") ? groupMessageContent(target) : { name: target.direction === "OUTBOUND" ? target.senderName || "Você" : target.conversation.contactName || "Contato", body: target.body };
  return { quoted, metadata: { quotedProviderId: target.providerId, quotedBody: content.body, quotedAuthor: content.name } };
}

export async function reactToWhatsAppMessageAction(formData: FormData) {
  const auth = await requireModuleEdit("support");
  const parsed = z.object({ messageId: z.string().min(1), emoji: z.union([z.enum(reactionEmojis), z.literal("")]) }).safeParse({ messageId: formData.get("messageId"), emoji: formData.get("emoji") });
  if (!parsed.success) throw new Error("Reação inválida.");
  const accountJid = await getActiveWhatsAppAccountJid(auth.arenaId);
  if (!accountJid) throw new Error("O WhatsApp da arena não está conectado.");
  const target = await prisma.whatsAppMessage.findFirst({ where: { id: parsed.data.messageId, conversation: { arenaId: auth.arenaId, accountJid } }, include: { conversation: { select: { remoteJid: true } } } });
  if (!target) throw new Error("Mensagem não encontrada nesta conta.");
  await sendEvolutionReaction({ id: target.providerId, remoteJid: target.conversation.remoteJid, fromMe: target.direction === "OUTBOUND", ...(target.participantJid ? { participant: target.participantJid } : {}) }, parsed.data.emoji, auth.arenaId);
  const reactions = await persistWhatsAppReaction(auth.arenaId, accountJid, target.providerId, accountJid, parsed.data.emoji);
  revalidatePath("/whatsapp");
  return { messageId: target.id, reactions: reactions ?? [] };
}

export async function sendWhatsAppChatMessageAction(formData: FormData) {
  const auth = await requireModuleEdit("support");
  const parsed = sendSchema.safeParse({ conversationId: formData.get("conversationId"), body: formData.get("body") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const conversation = await getArenaWhatsAppConversation(auth.arenaId, parsed.data.conversationId);
  if (!conversation) throw new Error("Conversa não encontrada.");
  const reply = await replyContext(auth.arenaId, conversation.id, formData);
  const delivery = await sendEvolutionTextMessage(conversation.remoteJid?.endsWith("@g.us") ? conversation.remoteJid : conversation.contactPhone || conversation.remoteJid.replace(/@.*$/, ""), parsed.data.body, auth.arenaId, reply.quoted);
  return persistOutboundWhatsAppMessage(auth.arenaId, conversation.id, { ...reply.metadata, senderUserId: auth.userId, senderName: auth.userName, providerId: getEvolutionProviderId(delivery), body: parsed.data.body });
}

export async function sendWhatsAppAudioMessageAction(formData: FormData) {
  const auth = await requireModuleEdit("support");
  const conversationId = String(formData.get("conversationId") ?? "");
  const audio = formData.get("audio");
  if (!conversationId || !(audio instanceof File) || !audio.size) throw new Error("Gravação de áudio inválida.");
  if (audio.size > 16 * 1024 * 1024) throw new Error("O áudio pode ter no máximo 16 MB.");
  const conversation = await getArenaWhatsAppConversation(auth.arenaId, conversationId);
  if (!conversation) throw new Error("Conversa não encontrada.");
  const mimeType = audio.type || "audio/webm";
  const dataUrl = `data:${mimeType};base64,${Buffer.from(await audio.arrayBuffer()).toString("base64")}`;
  const reply = await replyContext(auth.arenaId, conversation.id, formData);
  const delivery = await sendEvolutionAudioMessage(conversation.remoteJid?.endsWith("@g.us") ? conversation.remoteJid : conversation.contactPhone || conversation.remoteJid.replace(/@.*$/, ""), dataUrl, auth.arenaId, reply.quoted);
  return persistOutboundWhatsAppMessage(auth.arenaId, conversation.id, { ...reply.metadata, senderUserId: auth.userId, senderName: auth.userName, providerId: getEvolutionProviderId(delivery), body: "Áudio", mediaType: "AUDIO", mediaMimeType: mimeType, mediaUrl: dataUrl });
}

export async function sendWhatsAppMediaMessageAction(formData: FormData) {
  const auth = await requireModuleEdit("support"); const conversationId = String(formData.get("conversationId") ?? ""); const file = formData.get("file");
  if (!conversationId || !(file instanceof File) || !file.size) throw new Error("Anexo inválido.");
  if (file.size > 16 * 1024 * 1024) throw new Error("O anexo pode ter no máximo 16 MB.");
  const mediaType = file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "document" : null;
  if (!mediaType) throw new Error("Envie uma imagem ou PDF.");
  const conversation = await getArenaWhatsAppConversation(auth.arenaId, conversationId); if (!conversation) throw new Error("Conversa não encontrada.");
  const reply = await replyContext(auth.arenaId, conversation.id, formData);
  const dataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`; const delivery = await sendEvolutionMediaMessage(conversation.remoteJid?.endsWith("@g.us") ? conversation.remoteJid : conversation.contactPhone || conversation.remoteJid.replace(/@.*$/, ""), dataUrl, mediaType, file.name, file.type, auth.arenaId, reply.quoted);
  return persistOutboundWhatsAppMessage(auth.arenaId, conversation.id, { ...reply.metadata, senderUserId: auth.userId, senderName: auth.userName, providerId: getEvolutionProviderId(delivery), body: mediaType === "image" ? "Imagem" : "Documento", mediaType: mediaType === "image" ? "IMAGE" : "DOCUMENT", mediaMimeType: file.type, mediaUrl: dataUrl });
}

export async function markWhatsAppConversationReadAction(formData: FormData) {
  const auth = await requireModuleView("support"); const parsed = readSchema.safeParse({ conversationId: formData.get("conversationId") });
  if (!parsed.success) throw new Error("Conversa inválida.");
  const where = await activeConversationScope(auth.arenaId, parsed.data.conversationId);
  await withArenaTransaction(auth.arenaId, (tx) => tx.whatsAppConversation.updateMany({ where, data: { unreadCount: 0 } }));
  revalidatePath("/whatsapp");
  revalidatePath("/", "layout");
}

export async function linkWhatsAppConversationToClientAction(formData: FormData) {
  const auth = await requireModuleEdit("support");
  const parsed = linkSchema.safeParse({ conversationId: formData.get("conversationId"), playerId: formData.get("playerId") });
  if (!parsed.success) throw new Error("Selecione um cliente válido.");
  const where = await activeConversationScope(auth.arenaId, parsed.data.conversationId);
  const [conversation, player] = await Promise.all([
    prisma.whatsAppConversation.findFirst({ where, select: { id: true } }),
    prisma.player.findFirst({ where: { id: parsed.data.playerId, arenaId: auth.arenaId, active: true }, select: { id: true } })
  ]);
  if (!conversation || !player) throw new Error("Conversa ou cliente não encontrado.");
  await prisma.whatsAppConversation.update({ where: { id: conversation.id }, data: { playerId: player.id } });
  revalidatePath("/whatsapp");
}

export async function updateWhatsAppSlaAction(formData: FormData) {
  const auth = await requireModuleEdit("support");
  const parsed = slaSchema.safeParse({ minutes: formData.get("minutes") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "SLA inválido.");
  await prisma.arena.update({ where: { id: auth.arenaId }, data: { whatsappSlaMinutes: parsed.data.minutes } });
  revalidatePath("/whatsapp");
}

export async function updateWhatsAppConversationAction(formData: FormData) {
  const auth = await requireModuleEdit("support");
  const parsed = conversationActionSchema.safeParse({ conversationId: formData.get("conversationId"), action: formData.get("action"), listName: formData.get("listName") || undefined });
  if (!parsed.success) throw new Error("Ação de conversa inválida.");
  const where = await activeConversationScope(auth.arenaId, parsed.data.conversationId);
  if (parsed.data.action === "delete") {
    const removed = await prisma.whatsAppConversation.deleteMany({ where });
    if (!removed.count) throw new Error("Conversa não encontrada.");
  } else if (parsed.data.action === "clear") {
    await prisma.whatsAppMessage.deleteMany({ where: { conversation: where } });
    await prisma.whatsAppConversation.updateMany({ where, data: { updatedAt: new Date() } });
  } else if (parsed.data.action === "resolve_sla") {
    const updated = await prisma.whatsAppConversation.updateMany({ where: { ...where, remoteJid: { not: { endsWith: "@g.us" } } }, data: { slaResolvedAt: new Date(), unreadCount: 0 } });
    if (!updated.count) throw new Error("SLA disponível apenas para conversas individuais desta conta.");
  } else {
    const conversation = await prisma.whatsAppConversation.findFirst({ where, select: { pinned: true, favorite: true, archivedAt: true } });
    if (!conversation) throw new Error("Conversa não encontrada.");
    const data = parsed.data.action === "archive" ? { archivedAt: conversation.archivedAt ? null : new Date() }
      : parsed.data.action === "pin" ? { pinned: !conversation.pinned }
      : parsed.data.action === "favorite" ? { favorite: !conversation.favorite }
      : parsed.data.action === "list" ? { listName: parsed.data.listName || "Lista de atendimento" }
      : { unreadCount: 1 };
    await prisma.whatsAppConversation.update({ where: { id: parsed.data.conversationId }, data });
  }
  revalidatePath("/whatsapp");
  revalidatePath("/", "layout");
}

export async function createWhatsAppContactAction(formData: FormData) {
  const auth = await requireModuleEdit("support");
  const parsed = contactSchema.safeParse({ name: formData.get("name"), phone: formData.get("phone") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Contato inválido.");
  const player = await prisma.player.create({ data: { arenaId: auth.arenaId, name: parsed.data.name, phone: parsed.data.phone } });
  revalidatePath("/whatsapp");
  return { id: player.id, name: player.name };
}

export async function refreshWhatsAppConversationProfilePhotoAction(formData: FormData) {
  const auth = await requireModuleView("support");
  const parsed = readSchema.safeParse({ conversationId: formData.get("conversationId") });
  if (!parsed.success) throw new Error("Conversa inválida.");
  const where = await activeConversationScope(auth.arenaId, parsed.data.conversationId);
  const conversation = await prisma.whatsAppConversation.findFirst({ where, select: { id: true, remoteJid: true, profilePhotoUrl: true } });
  if (!conversation) throw new Error("Conversa não encontrada.");
  const profilePhotoUrl = await getEvolutionProfilePicture(conversation.remoteJid, auth.arenaId);
  if (profilePhotoUrl && profilePhotoUrl !== conversation.profilePhotoUrl) await prisma.whatsAppConversation.update({ where: { id: conversation.id }, data: { profilePhotoUrl } });
  return { profilePhotoUrl: profilePhotoUrl || conversation.profilePhotoUrl };
}

export async function refreshWhatsAppGroupNameAction(formData: FormData) {
  const auth = await requireModuleView("support"); const parsed = readSchema.safeParse({ conversationId: formData.get("conversationId") });
  if (!parsed.success) throw new Error("Conversa inválida.");
  const where = await activeConversationScope(auth.arenaId, parsed.data.conversationId);
  const conversation = await prisma.whatsAppConversation.findFirst({ where: { ...where, remoteJid: { endsWith: "@g.us" } }, select: { id: true, remoteJid: true } });
  if (!conversation) return { name: "" };
  const name = await getEvolutionGroupName(conversation.remoteJid, auth.arenaId);
  if (name) await prisma.whatsAppConversation.update({ where: { id: conversation.id }, data: { contactName: name } });
  return { name };
}
