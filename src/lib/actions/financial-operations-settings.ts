"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModuleView, requirePermission } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
const schema = z.object({ cashRegisterRequired: z.boolean(), comandaCardsEnabled: z.boolean(), preventOverpayment: z.boolean(), requireFullPayment: z.boolean(), blockDelinquentComandas: z.boolean(), delinquentAfterDays: z.coerce.number().int().min(0).max(3650) });
export async function saveFinancialOperationsSettingsAction(form: FormData) {
  await requireModuleView("finance");
  const auth = await requirePermission("finance:settings:manage");
  const parsed = schema.safeParse({ cashRegisterRequired: form.get("cashRegisterRequired") === "on", comandaCardsEnabled: form.get("comandaCardsEnabled") === "on", preventOverpayment: form.get("preventOverpayment") === "on", requireFullPayment: form.get("requireFullPayment") === "on", blockDelinquentComandas: form.get("blockDelinquentComandas") === "on", delinquentAfterDays: form.get("delinquentAfterDays") });
  if (!parsed.success) return { error: "Revise as regras. O prazo deve ser um número inteiro entre 0 e 3.650 dias." };
  await withArenaTransaction(auth.arenaId, async tx => {
    await tx.arenaOperationalSettings.upsert({ where: { arenaId: auth.arenaId }, create: { arenaId: auth.arenaId, ...parsed.data }, update: parsed.data });
    await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName, action: "FINANCIAL_OPERATIONS_SETTINGS_UPDATED", entityId: auth.arenaId, details: parsed.data } });
  });
  revalidatePath("/financeiro/configuracoes"); revalidatePath("/comandas"); revalidatePath("/configuracoes");
  return { error: null };
}
