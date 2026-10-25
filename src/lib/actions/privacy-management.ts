"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { canPerformPermission } from "@/lib/permissions";
import { releaseRetainedContact } from "@/lib/legal/contact-review";

export async function releaseRetainedContactAction(form: FormData) {
  const auth = await requirePermission("arena:settings");
  if (!canPerformPermission("finance:settings:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) return { error: "A liberação requer permissão de configurações financeiras." };
  const parsed = z.object({ referenceId: z.string().min(1).max(100), reason: z.string().trim().min(20, "Registre a verificação e o motivo da liberação.").max(1000) }).safeParse({ referenceId: form.get("referenceId"), reason: form.get("reason") });
  if (!parsed.success || form.get("confirmRelease") !== "on") return { error: "Informe a verificação e confirme que a liberação não transfere débitos nem altera o histórico." };
  const released = await withArenaTransaction(auth.arenaId, tx => releaseRetainedContact(tx, { ...parsed.data, arenaId: auth.arenaId, userId: auth.userId, userName: auth.userName }));
  revalidatePath("/configuracoes/privacidade");
  return released ? { error: null } : { error: "Referência não encontrada nesta arena ou já liberada." };
}

export async function respondPrivacyRequestAction(form: FormData) {
  const auth = await requirePermission("arena:settings");
  const parsed = z.object({ requestId: z.string().min(1).max(100), response: z.string().trim().min(20, "Explique o atendimento e a eventual conservação de dados.").max(6000) }).safeParse({ requestId: form.get("requestId"), response: form.get("response") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise a resposta." };
  const result = await withArenaTransaction(auth.arenaId, async tx => {
    const request = await tx.privacyRequest.findFirst({ where: { id: parsed.data.requestId, arenaId: auth.arenaId, status: "OPEN" }, select: { id: true, playerId: true } });
    if (!request) return { error: "Solicitação não encontrada ou já respondida." };
    const claimed = await tx.privacyRequest.updateMany({ where: { id: request.id, arenaId: auth.arenaId, status: "OPEN" }, data: { status: "COMPLETED", response: parsed.data.response, resolvedAt: new Date() } });
    if (claimed.count !== 1) return { error: "Esta solicitação já foi respondida." };
    await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName, action: "PRIVACY_REQUEST_RESPONDED", entityId: request.id, details: { playerId: request.playerId } } });
    const arena = await tx.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { slug: true } });
    await tx.playerNotification.create({ data: { playerId: request.playerId, title: "Resposta à sua solicitação de privacidade", message: "A arena respondeu. Consulte a área Meus dados para ler a resposta.", href: `/classificacao/${encodeURIComponent(arena.slug)}/dados` } });
    return { error: null };
  });
  revalidatePath("/configuracoes/privacidade");
  revalidatePath("/classificacao", "layout");
  return result;
}
