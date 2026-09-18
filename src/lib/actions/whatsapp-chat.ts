"use server";

import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { z } from "zod";
import { requireModuleEdit, requireModuleView } from "@/lib/auth/guards";
import { sendEvolutionTextMessage } from "@/lib/integrations/evolution/client";
import { withArenaTransaction } from "@/lib/rls";

const sendSchema = z.object({ conversationId: z.string().min(1), body: z.string().trim().min(1, "Escreva uma mensagem.").max(4096, "A mensagem é muito longa.") });
const readSchema = z.object({ conversationId: z.string().min(1) });

export async function sendWhatsAppChatMessageAction(formData: FormData) {
  const auth = await requireModuleEdit("support");
  const parsed = sendSchema.safeParse({ conversationId: formData.get("conversationId"), body: formData.get("body") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const conversation = await withArenaTransaction(auth.arenaId, (tx) => tx.whatsAppConversation.findFirst({ where: { id: parsed.data.conversationId, arenaId: auth.arenaId } }));
  if (!conversation) throw new Error("Conversa não encontrada.");
  await sendEvolutionTextMessage(conversation.contactPhone || conversation.remoteJid.replace(/@.*$/, ""), parsed.data.body, auth.arenaId);
  await withArenaTransaction(auth.arenaId, (tx) => tx.whatsAppMessage.create({ data: { conversationId: conversation.id, providerId: `out-${crypto.randomUUID()}`, direction: "OUTBOUND", body: parsed.data.body, sentAt: new Date() } }).then(() => tx.whatsAppConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } })));
  revalidatePath("/whatsapp");
}

export async function markWhatsAppConversationReadAction(formData: FormData) {
  const auth = await requireModuleView("support"); const parsed = readSchema.safeParse({ conversationId: formData.get("conversationId") });
  if (!parsed.success) throw new Error("Conversa inválida.");
  await withArenaTransaction(auth.arenaId, (tx) => tx.whatsAppConversation.updateMany({ where: { id: parsed.data.conversationId, arenaId: auth.arenaId }, data: { unreadCount: 0 } }));
  revalidatePath("/whatsapp");
}
