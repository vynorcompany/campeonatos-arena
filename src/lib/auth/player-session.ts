import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const PLAYER_SESSION_COOKIE = "arena_player_session";
const PLAYER_SESSION_DAYS = 14;

function hashToken(token: string) { return crypto.createHash("sha256").update(token).digest("hex"); }

export async function createPublicPlayerSession(playerAccountId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PLAYER_SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.playerSession.create({ data: { token: hashToken(token), expiresAt, playerAccountId } });
  cookies().set(PLAYER_SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: expiresAt, path: "/" });
}

export async function destroyPublicPlayerSession() {
  const token = cookies().get(PLAYER_SESSION_COOKIE)?.value;
  if (token) await prisma.playerSession.deleteMany({ where: { token: { in: [token, hashToken(token)] } } });
  cookies().delete(PLAYER_SESSION_COOKIE);
}

export async function getPublicPlayerAuth(arenaSlug: string) {
  const token = cookies().get(PLAYER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.playerSession.findFirst({ where: { token: { in: [token, hashToken(token)] } }, include: { playerAccount: { include: { player: { include: { arena: { select: { slug: true } } } } } } } });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.playerSession.delete({ where: { id: session.id } });
    return null;
  }
  const player = session.playerAccount.player;
  if (!player.active || player.arena.slug !== arenaSlug) return null;
  return { playerId: player.id, playerAccountId: session.playerAccountId, name: player.name, arenaId: player.arenaId };
}

export async function requirePublicPlayerAuth(arenaSlug: string) {
  const auth = await getPublicPlayerAuth(arenaSlug);
  if (!auth) throw new Error("Entre na sua conta de cliente para realizar uma reserva.");
  return auth;
}
