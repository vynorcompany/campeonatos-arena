"use server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { revalidatePath } from "next/cache";
export async function savePrinterSettingsAction(form: FormData) {
  const auth = await requirePermission("arena:settings");
  const parsed = z.object({ printerPaper: z.enum(["58MM", "80MM", "A4"]), printerCopies: z.coerce.number().int().min(1).max(3) }).safeParse({ printerPaper: form.get("printerPaper"), printerCopies: form.get("printerCopies") });
  if (!parsed.success) return { error: "Escolha um formato e de uma a três vias." };
  await withArenaTransaction(auth.arenaId, async tx => {
    await tx.arenaOperationalSettings.upsert({ where: { arenaId: auth.arenaId }, create: { arenaId: auth.arenaId, ...parsed.data }, update: parsed.data });
    await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName, action: "PRINTER_SETTINGS_UPDATED", entityId: auth.arenaId, details: parsed.data } });
  });
  revalidatePath("/configuracoes/impressora");
  return { error: null };
}
