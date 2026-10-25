"use server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
export async function revokeDeviceSessionAction(form: FormData) {
  const auth = await requireAuth();
  const parsed = z.string().min(1).max(100).safeParse(form.get("sessionId"));
  if (!parsed.success) return { error: "Sessão inválida." };
  const token = (await cookies()).get(env.sessionCookieName)?.value;
  const currentTokens = token ? [token, createHash("sha256").update(token).digest("hex")] : [];
  const result = await prisma.session.deleteMany({ where: { id: parsed.data, userId: auth.userId, token: { notIn: currentTokens } } });
  if (!result.count) return { error: "Sessão indisponível ou em uso neste dispositivo." };
  revalidatePath("/configuracoes/dispositivos");
  return { error: null };
}
