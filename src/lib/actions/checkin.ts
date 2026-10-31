"use server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { withArenaTransaction } from "@/lib/rls";
import { registerQrLessonCheckin } from "@/lib/checkin/lesson";
import { registerCourtCheckin, registerSelectedCourtCheckins } from "@/lib/checkin/register";

export async function configureCourtCheckinAction(form: FormData) {
  const auth = await requirePermission("calendar:settings:manage");
  const enabled = form.has("checkinMode") ? undefined : form.get("enabled") === "true";
  const checkinMode = form.has("checkinMode") ? z.enum(["SELF", "GROUP"]).parse(form.get("checkinMode")) : undefined;
  await withArenaTransaction(auth.arenaId, async tx => {
    const arena = await tx.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { checkinToken: true } });
    await tx.arena.update({ where: { id: auth.arenaId }, data: { ...(enabled === undefined ? {} : { checkinEnabled: enabled }), ...(checkinMode ? { checkinMode } : {}),
      ...(enabled && (!arena.checkinToken || form.get("rotate") === "true") ? { checkinToken: randomBytes(32).toString("hex") } : {}),
    } });
  });
  revalidatePath("/agenda/configuracao");
  revalidatePath("/configuracoes/checkin");
}

export async function registerCourtCheckinAction(form: FormData) {
  const parsed = z.object({ arenaSlug: z.string().min(1), token: z.string().length(64), occurrenceId: z.string().min(1), courtId: z.string().min(1) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Escolha uma quadra e um horário válidos usando o QR Code da arena." };
  try {
    const auth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
    const selected = z.array(z.string().min(1)).max(64).parse(form.getAll("playerIds"));
    await withArenaTransaction(auth.arenaId, async tx => {
      if (selected.length || form.get("selectionMode") === "group") await registerSelectedCourtCheckins(tx, { ...parsed.data, arenaId: auth.arenaId, playerId: auth.playerId, playerIds: selected });
      else await registerCourtCheckin(tx, { ...parsed.data, arenaId: auth.arenaId, playerId: auth.playerId });
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível confirmar sua presença. Tente novamente ou procure a recepção." };
  }
  revalidatePath("/agenda");
  revalidatePath("/home");
  revalidatePath(`/checkin/${parsed.data.arenaSlug}`);
}

export async function registerLessonQrCheckinAction(form: FormData) {
  const parsed = z.object({ arenaSlug: z.string().min(1), token: z.string().length(64), lessonId: z.string().min(1) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Escolha uma aula válida usando o QR Code da arena." };
  try {
    const auth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
    await withArenaTransaction(auth.arenaId, tx => registerQrLessonCheckin(tx, { ...parsed.data, arenaId: auth.arenaId, playerId: auth.playerId }));
  } catch (error) { return { error: error instanceof Error ? error.message : "Não foi possível confirmar sua presença na aula." }; }
  revalidatePath(`/checkin/${parsed.data.arenaSlug}`);
  revalidatePath(`/classificacao/${parsed.data.arenaSlug}`);
  revalidatePath("/home");
  revalidatePath("/aulas");
}
