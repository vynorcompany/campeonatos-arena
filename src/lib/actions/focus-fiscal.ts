"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";
import { dispatchFocusNfce } from "@/lib/fiscal/focus-issuance";
export async function consultFocusDocumentAction(form: FormData) {
  const auth = await requirePermission("finance:settings:manage");
  const id = String(form.get("documentId") ?? "");
  const document = await arenaDatabase(auth.arenaId).fiscalDocument.findFirst({ where: { id, arenaId: auth.arenaId, provider: "FOCUS" }, select: { id: true, status: true } });
  if (!document) return { error: "Nota não encontrada nesta arena." };
  const reason = String(form.get("cancelReason") ?? "").trim();
  if (reason && (reason.length < 15 || reason.length > 255)) return { error: "Informe uma justificativa de cancelamento com 15 a 255 caracteres." };
  if (reason && document.status !== "AUTHORIZED") return { error: "Somente notas autorizadas podem ser canceladas." };
  if (!reason && ["AUTHORIZED","CANCELLED","REJECTED","DENIED"].includes(document.status)) return { error: "Esta nota já tem resultado definitivo. Confira a mensagem fiscal." };
  await dispatchFocusNfce(auth.arenaId, id, reason || undefined);
  await arenaDatabase(auth.arenaId).auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName, entityId: id, action: reason ? "FOCUS_CANCEL_REQUESTED" : "FOCUS_CONSULT_REQUESTED", details: reason ? { reason } : {} } });
  revalidatePath("/financeiro/notas-fiscais");
}
