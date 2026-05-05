import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { allPermissionModules } from "@/lib/permissions";
import type { ArenaMembership, ArenaRole, SystemRole } from "@/types/auth";

const SESSION_TTL_DAYS = env.sessionTtlDays;
const sessionCookieName = env.sessionCookieName;
const arenaCookieName = env.arenaCookieName;

export type AuthContext = {
  userId: string;
  userName: string;
  userEmail: string;
  systemRole: SystemRole;
  arenaRole: ArenaRole | null;
  arenaId: string | null;
  arenaName: string | null;
  viewPermissions: string[];
  editPermissions: string[];
  memberships: ArenaMembership[];
};

function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function getSessionWithUser(token: string) {
  return prisma.session.findUnique({
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
}

function getSelectedArenaId() {
  return cookies().get(arenaCookieName)?.value ?? null;
}

function getActiveMembership(memberships: ArenaMembership[], selectedArenaId: string | null) {
  if (selectedArenaId) {
    const selectedMembership = memberships.find((membership) => membership.arenaId === selectedArenaId);

    if (selectedMembership) {
      return selectedMembership;
    }
  }

  return memberships[0] ?? null;
}

function isAgencyRole(systemRole: SystemRole) {
  return systemRole === "SUPER_ADMIN" || systemRole === "ADMIN" || systemRole === "MANAGER";
}

export async function setArenaContextCookie(arenaId: string) {
  cookies().set(arenaCookieName, arenaId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export async function clearArenaContextCookie() {
  cookies().delete(arenaCookieName);
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashSessionToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  const user = await prisma.user.findUnique({
    where: { id: userId },
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
  });

  await prisma.session.create({
    data: {
      token: hashedToken,
      userId,
      expiresAt
    }
  });

  cookies().set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/"
  });

  const firstMembership = user?.memberships[0];

  if (firstMembership) {
    await setArenaContextCookie(firstMembership.arenaId);
  }
}

export async function destroySession() {
  const token = cookies().get(sessionCookieName)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: {
        token: {
          in: [token, hashSessionToken(token)]
        }
      }
    });
  }

  cookies().delete(sessionCookieName);
  cookies().delete(arenaCookieName);
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const token = cookies().get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const hashedToken = hashSessionToken(token);
  let session = await getSessionWithUser(hashedToken);

  if (!session) {
    session = await getSessionWithUser(token);

    if (session) {
      await prisma.session.update({
        where: { id: session.id },
        data: {
          token: hashedToken
        }
      });
    }
  }

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({
        where: { id: session.id }
      });
    }

    return null;
  }

  const memberships: ArenaMembership[] = session.user.memberships.map((membership) => ({
    arenaId: membership.arenaId,
    arenaName: membership.arena.name,
    arenaLogoUrl: membership.arena.logoUrl || "/arena-profile.jpg",
    arenaRole: membership.role as ArenaRole,
    viewPermissions: membership.viewPermissions,
    editPermissions: membership.editPermissions
  }));
  const systemRole = session.user.systemRole as SystemRole;
  const membershipArenaIds = new Set(memberships.map((membership) => membership.arenaId));

  if (isAgencyRole(systemRole)) {
    const agencyArenas = await prisma.arena.findMany({
      where: {
        id: {
          notIn: [...membershipArenaIds]
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    memberships.push(
      ...agencyArenas.map((arena) => ({
        arenaId: arena.id,
        arenaName: arena.name,
        arenaLogoUrl: arena.logoUrl || "/arena-profile.jpg",
        arenaRole: "OWNER" as ArenaRole,
        viewPermissions: allPermissionModules,
        editPermissions: allPermissionModules
      }))
    );
  }

  const activeMembership = getActiveMembership(memberships, getSelectedArenaId());

  return {
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
    systemRole,
    arenaRole: activeMembership?.arenaRole ?? null,
    arenaId: activeMembership?.arenaId ?? null,
    arenaName: activeMembership?.arenaName ?? null,
    viewPermissions: activeMembership?.viewPermissions ?? [],
    editPermissions: activeMembership?.editPermissions ?? [],
    memberships
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
