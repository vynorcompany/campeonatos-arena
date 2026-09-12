"use server";

import { revalidatePath } from "next/cache";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { prisma } from "@/lib/prisma";

export async function markPublicPlayerNotificationReadAction(arenaSlug: string, notificationId: string, source: "PLAYER" | "ARENA" | "FINANCE") {
  const auth = await requirePublicPlayerAuth(arenaSlug);
  if (source === "PLAYER") await prisma.playerNotification.updateMany({ where: { id: notificationId, playerId: auth.playerId, readAt: null }, data: { readAt: new Date() } });
  else await prisma.playerPortalNotificationRead.upsert({ where: { playerId_notificationKey: { playerId: auth.playerId, notificationKey: notificationId } }, update: { readAt: new Date() }, create: { playerId: auth.playerId, notificationKey: notificationId } });
  revalidatePath(`/classificacao/${arenaSlug}`);
}

export async function markAllPublicPlayerNotificationsReadAction(arenaSlug: string, notificationIds: Array<{ id: string; source: "PLAYER" | "ARENA" | "FINANCE" }>) {
  const auth = await requirePublicPlayerAuth(arenaSlug);
  const playerIds = notificationIds.filter((item) => item.source === "PLAYER").map((item) => item.id);
  const externalIds = notificationIds.filter((item) => item.source !== "PLAYER").map((item) => item.id);
  await prisma.$transaction([
    prisma.playerNotification.updateMany({ where: { id: { in: playerIds }, playerId: auth.playerId, readAt: null }, data: { readAt: new Date() } }),
    ...(externalIds.length ? [prisma.playerPortalNotificationRead.createMany({ data: externalIds.map((notificationKey) => ({ playerId: auth.playerId, notificationKey })), skipDuplicates: true })] : []),
  ]);
  revalidatePath(`/classificacao/${arenaSlug}`);
}
