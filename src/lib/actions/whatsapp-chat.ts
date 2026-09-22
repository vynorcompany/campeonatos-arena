"use server";

import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { z } from "zod";
import { requireModuleEdit, requireModuleView } from "@/lib/auth/guards";
import { getEvolutionProfilePicture, sendEvolutionTextMessage } from "@/lib/integrations/evolution/client";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";

const sendSchema = z.object({ conversationId: z.string().min(1), body: z.string().trim().min(1, "Escreva uma mensagem.").max(4096, "A mensagem é muito longa.") });
const readSchema = z.object({ conversationId: z.string().min(1) });
const linkSchema = z.object({ conversationId: z.string().min(1), playerId: z.string().min(1) });
const slaSchema = z.object({ minutes: z.coerce.number().int().min(5, "O SLA mínimo é de 5 minutos.").max(1_440, "O SLA máximo é de 24 horas.") });
const conversationActionSchema = z.object({ conversationId: z.string().min(1), action: z.enum(["archive", "pin", "unread", "favorite", "list", "clear", "delete"]), listName: z.string().trim().max(80).optional() });
const contactSchema = z.object({ name: z.string().trim().min(3, "Informe o nome do contato."), phone: z.string().trim().min(8, "Informe o telefone do contato.") });

export async function sendWhatsAppChatMessageAction(formData: FormData) {
  const auth = await requireModuleEdit("support");
  const parsed = sendSchema.safeParse({ conversationId: formData.get("conversationId"), body: formData.get("body") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const conversation = await withArenaTransaction(auth.arenaId, (tx) => tx.whatsAppConversation.findFirst({ where: { id: parsed.data.conversationId, arenaId: auth.arenaId } }));
  if (!conversation) throw new Error("Conversa não encontrada.");
  await sendEvolutionTextMessage(conversation.contactPhone || conversation.remoteJid.replace(/@.*$/, ""), parsed.data.body, auth.arenaId);
  const message = await withArenaTransaction(auth.arenaId, (tx) => tx.whatsAppMessage.create({ data: { conversationId: conversation.id, providerId: `out-${crypto.randomUUID()}`, direction: "OUTBOUND", body: parsed.data.body, sentAt: new Date() } }).then(async (created) => { await tx.whatsAppConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } }); return created; }));
  return { id: message.id, direction: message.direction, body: message.body, sentAt: message.sentAt.toISOString() };
}

export async function markWhatsAppConversationReadAction(formData: FormData) {
  const auth = await requireModuleView("support"); const parsed = readSchema.safeParse({ conversationId: formData.get("conversationId") });
  if (!parsed.success) throw new Error("Conversa inválida.");
  await withArenaTransaction(auth.arenaId, (tx) => tx.whatsAppConversation.updateMany({ where: { id: parsed.data.conversationId, arenaId: auth.arenaId }, data: { unreadCount: 0 } }));
  revalidatePath("/whatsapp");
}

export async function linkWhatsAppConversationToClientAction(formData: FormData) {
  const auth = await requireModuleEdit("support");
  const parsed = linkSchema.safeParse({ conversationId: formData.get("conversationId"), playerId: formData.get("playerId") });
  if (!parsed.success) throw new Error("Selecione um cliente válido.");
  const [conversation, player] = await Promise.all([
    prisma.whatsAppConversation.findFirst({ where: { id: parsed.data.conversationId, arenaId: auth.arenaId }, select: { id: true } }),
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
  const where = { id: parsed.data.conversationId, arenaId: auth.arenaId };
  if (parsed.data.action === "delete") {
    const removed = await prisma.whatsAppConversation.deleteMany({ where });
    if (!removed.count) throw new Error("Conversa não encontrada.");
  } else if (parsed.data.action === "clear") {
    await prisma.whatsAppMessage.deleteMany({ where: { conversation: where } });
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
  const conversation = await prisma.whatsAppConversation.findFirst({ where: { id: parsed.data.conversationId, arenaId: auth.arenaId }, select: { id: true, remoteJid: true, profilePhotoUrl: true } });
  if (!conversation) throw new Error("Conversa não encontrada.");
  const profilePhotoUrl = await getEvolutionProfilePicture(conversation.remoteJid, auth.arenaId);
  if (profilePhotoUrl && profilePhotoUrl !== conversation.profilePhotoUrl) await prisma.whatsAppConversation.update({ where: { id: conversation.id }, data: { profilePhotoUrl } });
  return { profilePhotoUrl: profilePhotoUrl || conversation.profilePhotoUrl };
}
