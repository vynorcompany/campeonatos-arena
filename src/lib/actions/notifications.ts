"use server";

import { revalidatePath } from "next/cache";
import { requireArenaAccess } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function markArenaNotificationsReadAction() {
  const auth = await requireArenaAccess();
  await prisma.arenaNotification.updateMany({ where: { arenaId: auth.arenaId, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/agenda");
}
