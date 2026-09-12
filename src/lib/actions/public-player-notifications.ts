"use server";

import { revalidatePath } from "next/cache";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { prisma } from "@/lib/prisma";

export async function markPublicPlayerNotificationReadAction(arenaSlug: string, notificationId: string) {
  const auth = await requirePublicPlayerAuth(arenaSlug);
  await prisma.playerNotification.updateMany({ where: { id: notificationId, playerId: auth.playerId, readAt: null }, data: { readAt: new Date() } });
  revalidatePath(`/classificacao/${arenaSlug}`);
}
