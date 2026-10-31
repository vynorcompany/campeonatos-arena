"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModuleView, requirePermission, requireWhatsAppManage, requireWhatsAppSend } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { dispatchComandaWhatsapp } from "@/lib/comandas/whatsapp-delivery";
const schema = z.object({ whatsappPaidEnabled: z.boolean(), whatsappUnpaidEnabled: z.boolean(), whatsappPaidMessage: z.string().trim().max(3000), whatsappUnpaidMessage: z.string().trim().max(3000) });

export async function saveComandaWhatsappSettingsAction(form: FormData) {
  await requireModuleView("finance");
  const auth = await requirePermission("finance:settings:manage");
  const parsed = schema.safeParse({ whatsappPaidEnabled: form.get("whatsappPaidEnabled") === "on", whatsappUnpaidEnabled: form.get("whatsappUnpaidEnabled") === "on", whatsappPaidMessage: form.get("whatsappPaidMessage") ?? form.get("whatsappMessage") ?? "", whatsappUnpaidMessage: form.get("whatsappUnpaidMessage") ?? form.get("whatsappMessage") ?? "" });
  if (!parsed.success) return { error: "A mensagem deve ter até 3.000 caracteres." };
  if (parsed.data.whatsappPaidEnabled || parsed.data.whatsappUnpaidEnabled) await requireWhatsAppManage();
  const result = await withArenaTransaction(auth.arenaId, async tx => {
    if (parsed.data.whatsappPaidEnabled || parsed.data.whatsappUnpaidEnabled) {
      const connection = await tx.whatsAppConnection.findUnique({ where: { arenaId: auth.arenaId }, select: { status: true, encryptedToken: true } });
      if (connection?.status !== "CONNECTED" || !connection.encryptedToken) return { error: "Conecte o WhatsApp desta arena antes de ativar as mensagens financeiras." };
    }
    await tx.arenaOperationalSettings.upsert({ where: { arenaId: auth.arenaId }, create: { arenaId: auth.arenaId, ...parsed.data, whatsappMessage: "" }, update: { ...parsed.data, whatsappMessage: "" } });
    await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName, action: "COMANDA_WHATSAPP_SETTINGS_UPDATED", entityId: auth.arenaId, details: parsed.data } });
    return { error: null };
  });
  revalidatePath("/financeiro/configuracoes"); return result;
}

export async function sendPendingComandaWhatsappAction() {
  await requireModuleView("finance");
  const auth = await requirePermission("finance:settings:manage");
  await requireWhatsAppSend();
  const pending = await withArenaTransaction(auth.arenaId, tx => tx.comandaWhatsappDelivery.findMany({ where: { arenaId: auth.arenaId, status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 20, select: { id: true } }));
  for (const row of pending) await dispatchComandaWhatsapp(auth.arenaId, row.id);
  revalidatePath("/financeiro/configuracoes");
  return { error: null };
}
