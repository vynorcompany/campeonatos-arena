"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { withArenaTransaction } from "@/lib/rls";

const entries = z.array(z.object({ id: z.string().min(1).max(256), source: z.enum(["PLAYER", "ARENA", "FINANCE"]) })).max(100);
export async function markAllPublicPlayerNotificationsReadAction(arenaSlug: string, notificationIds: Array<{ id: string; source: "PLAYER" | "ARENA" | "FINANCE" }>) {
  const auth = await requirePublicPlayerAuth(arenaSlug);
  const parsed = entries.safeParse(notificationIds);
  if (!parsed.success) return { error: "Não foi possível identificar as notificações." };
  try {
    await withArenaTransaction(auth.arenaId, async tx => {
      const playerIds = parsed.data.filter(item => item.source === "PLAYER").map(item => item.id);
      const externalIds = [...new Set(parsed.data.filter(item => item.source !== "PLAYER").map(item => item.id))];
      await tx.playerNotification.updateMany({ where: { id: { in: playerIds }, playerId: auth.playerId, player: { arenaId: auth.arenaId }, readAt: null }, data: { readAt: new Date() } });
      if (externalIds.length) await tx.playerPortalNotificationRead.createMany({ data: externalIds.map(notificationKey => ({ playerId: auth.playerId, notificationKey })), skipDuplicates: true });
    });
  } catch { return { error: "Não foi possível salvar a leitura. Tente novamente." }; }
  revalidatePath(`/classificacao/${arenaSlug}`);
  revalidatePath("/home");
  return { error: null };
}

export async function markPublicPlayerNotificationReadAction(arenaSlug: string, notificationId: string, source: "PLAYER" | "ARENA" | "FINANCE") {
  return markAllPublicPlayerNotificationsReadAction(arenaSlug, [{ id: notificationId, source }]);
}
