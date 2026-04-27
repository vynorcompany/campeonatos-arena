import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { ArenaRole, SystemRole } from "@/types/auth";

const SESSION_TTL_DAYS = 14;
const cookieName = process.env.SESSION_COOKIE_NAME ?? "padel_session";

export type AuthContext = {
  userId: string;
  userName: string;
  userEmail: string;
  systemRole: SystemRole;
  arenaRole: ArenaRole | null;
  arenaId: string | null;
  arenaName: string | null;
};

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt
    }
  });

  cookies().set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/"
  });
}

export async function destroySession() {
  const token = cookies().get(cookieName)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: { token }
    });
  }

  cookies().delete(cookieName);
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const token = cookies().get(cookieName)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          memberships: {
            include: {
              arena: true
            },
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      }
    }
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({
        where: { id: session.id }
      });
    }
    cookies().delete(cookieName);
    return null;
  }

  const primaryMembership = session.user.memberships[0] ?? null;

  return {
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
    systemRole: session.user.systemRole as SystemRole,
    arenaRole: (primaryMembership?.role as ArenaRole | undefined) ?? null,
    arenaId: primaryMembership?.arenaId ?? null,
    arenaName: primaryMembership?.arena.name ?? null
  };
}

export async function requireAuth() {
  const auth = await getAuthContext();

  if (!auth) {
    redirect("/login");
  }

  return auth;
}

export async function requireArenaAccess() {
  const auth = await requireAuth();

  if (!auth.arenaId) {
    redirect("/login");
  }

  return auth as AuthContext & { arenaId: string; arenaName: string | null };
}
