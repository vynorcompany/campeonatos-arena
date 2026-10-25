"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { cancellationPolicySchema } from "@/lib/legal/cancellation-policy";

export async function saveCancellationPolicyAction(form: FormData) {
  const auth = await requirePermission("arena:settings");
  const parsed = cancellationPolicySchema.safeParse({ cancellationPolicy: form.get("cancellationPolicy") ?? "", cancellationPolicyPublished: form.get("cancellationPolicyPublished") === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise a política." };
  await withArenaTransaction(auth.arenaId, async tx => {
    const previous = await tx.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId } });
    const changed = previous?.cancellationPolicy !== parsed.data.cancellationPolicy || previous?.cancellationPolicyPublished !== parsed.data.cancellationPolicyPublished;
    const data = { ...parsed.data, ...(changed ? { cancellationPolicyUpdatedAt: new Date() } : {}) };
    await tx.arenaOperationalSettings.upsert({ where: { arenaId: auth.arenaId }, create: { arenaId: auth.arenaId, ...data }, update: data });
    if (changed) await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName, action: "CANCELLATION_POLICY_UPDATED", entityId: auth.arenaId, details: { previousText: previous?.cancellationPolicy ?? "", ...parsed.data } } });
  });
  revalidatePath("/configuracoes/politicas");
  revalidatePath("/classificacao", "layout");
  return { error: null };
}
