"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModuleView, requirePermission } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
const schema = z.object({ portalConsumptionEnabled: z.boolean(), portalPaymentBankAccountId: z.string().max(100).nullable(), portalPaymentEnabled: z.boolean(), portalPixEnabled: z.boolean(), portalCreditCardEnabled: z.boolean(), checkoutExpiryMinutes: z.coerce.number().int().min(0).max(1440) }).refine(value => !value.portalPaymentEnabled || value.portalPixEnabled || value.portalCreditCardEnabled, "Ative Pix ou cartão de crédito para aceitar pagamentos.");

export async function savePortalPaymentSettingsAction(form: FormData) {
  await requireModuleView("finance");
  const auth = await requirePermission("finance:settings:manage");
  const parsed = schema.safeParse({ portalConsumptionEnabled: form.get("portalConsumptionEnabled") === "on", portalPaymentBankAccountId: String(form.get("portalPaymentBankAccountId") ?? "").trim() || null, portalPaymentEnabled: form.get("portalPaymentEnabled") === "on", portalPixEnabled: form.get("portalPixEnabled") === "on", portalCreditCardEnabled: form.get("portalCreditCardEnabled") === "on", checkoutExpiryMinutes: form.get("checkoutExpiryMinutes") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise as opções de pagamento." };
  const result = await withArenaTransaction(auth.arenaId, async tx => {
    const connection = await tx.paymentConnection.findUnique({ where: { arenaId_provider: { arenaId: auth.arenaId, provider: "MERCADO_PAGO" } }, select: { status: true } });
    if (parsed.data.portalPaymentEnabled && connection?.status !== "CONNECTED") return { error: "Conecte a conta do Mercado Pago da arena antes de ativar pagamentos no Portal." };
    if (parsed.data.portalPaymentEnabled && !parsed.data.portalPaymentBankAccountId) return { error: "Selecione a conta bancária para receber pagamentos do Portal." };
    if (parsed.data.portalPaymentBankAccountId) {
      const bank = await tx.bankAccount.findFirst({ where: { id: parsed.data.portalPaymentBankAccountId, arenaId: auth.arenaId }, select: { active: true } });
      if (!bank) return { error: "Conta de recebimento não encontrada nesta arena." };
      if (parsed.data.portalPaymentEnabled && !bank.active) return { error: "Selecione uma conta de recebimento ativa." };
    }
    const data = { ...parsed.data, portalPaymentsConfigured: true };
    await tx.arenaOperationalSettings.upsert({ where: { arenaId: auth.arenaId }, create: { arenaId: auth.arenaId, ...data }, update: data });
    await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName, action: "PORTAL_PAYMENT_SETTINGS_UPDATED", entityId: auth.arenaId, details: data } });
    return { error: null };
  });
  revalidatePath("/financeiro/configuracoes"); revalidatePath("/home"); revalidatePath("/classificacao", "layout");
  return result;
}
