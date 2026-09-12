import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const PLAYER_SESSION_COOKIE = "arena_player_session";
const PLAYER_SESSION_DAYS = 14;

function hashToken(token: string) { return crypto.createHash("sha256").update(token).digest("hex"); }
function parsePadelCategories(value: string, fallback: string) {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
  } catch {}
  return fallback.trim() ? [fallback.trim()] : [];
}

export async function createPublicPlayerSession(playerAccountId: string, athleteIdentityId?: string | null) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PLAYER_SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.playerSession.create({ data: { token: hashToken(token), expiresAt, playerAccountId, athleteIdentityId: athleteIdentityId ?? undefined } });
  cookies().set(PLAYER_SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: expiresAt, path: "/" });
}

export async function destroyPublicPlayerSession() {
  const token = cookies().get(PLAYER_SESSION_COOKIE)?.value;
  if (token) await prisma.playerSession.deleteMany({ where: { token: { in: [token, hashToken(token)] } } });
  cookies().delete(PLAYER_SESSION_COOKIE);
}

const membershipInclude = {
  player: { include: { arena: { select: { slug: true, name: true, logoUrl: true } }, teacher: { select: { active: true } } } },
} as const;

async function getSession() {
  const token = cookies().get(PLAYER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.playerSession.findFirst({
    where: { token: { in: [token, hashToken(token)] } },
    include: {
      athleteIdentity: { include: { accounts: { include: membershipInclude } } },
      playerAccount: { include: { identity: { include: { accounts: { include: membershipInclude } } }, player: { include: membershipInclude.player.include } } },
    },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.playerSession.delete({ where: { id: session.id } });
    return null;
  }
  return session;
}

export async function getPublicPlayerAuth(arenaSlug: string) {
  const session = await getSession();
  if (!session) return null;
  const identity = session.athleteIdentity ?? session.playerAccount.identity;
  const account = identity?.accounts.find((entry) => entry.player.active && entry.player.arena.slug === arenaSlug)
    ?? (session.playerAccount.player.active && session.playerAccount.player.arena.slug === arenaSlug ? session.playerAccount : null);
  if (!account) return null;
  const player = account.player;
  return { playerId: player.id, playerAccountId: account.id, athleteIdentityId: identity?.id ?? null, name: player.name, phone: player.phone, email: player.email, photoUrl: player.photoUrl, birthDate: player.birthDate?.toISOString().slice(0, 10) ?? "", gender: player.gender, padelCategories: parsePadelCategories(player.padelCategories, player.class), padelSide: player.padelSide, tournamentAvailability: player.tournamentAvailability, isTeacher: Boolean(player.teacher?.active), arenaId: player.arenaId };
}

export async function getPublicAthleteIdentity() {
  const session = await getSession();
  if (!session) return null;
  const identity = session.athleteIdentity ?? session.playerAccount.identity;
  const accounts = identity?.accounts ?? [session.playerAccount];
  return { id: identity?.id ?? null, phone: identity?.phone ?? session.playerAccount.phone, arenas: accounts.filter((account) => account.player.active).map((account) => ({ slug: account.player.arena.slug, name: account.player.arena.name, logoUrl: account.player.arena.logoUrl, playerName: account.player.name })) };
}

export async function requirePublicPlayerAuth(arenaSlug: string) {
  const auth = await getPublicPlayerAuth(arenaSlug);
  if (!auth) throw new Error("Entre na sua conta de cliente para realizar uma reserva.");
  return auth;
}
