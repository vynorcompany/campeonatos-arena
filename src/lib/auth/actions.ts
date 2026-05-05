"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getAuthContext, setArenaContextCookie } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { loginSchema, registerArenaSchema } from "@/lib/validators/auth";
import { defaultPermissionsForRole } from "@/lib/permissions";

export type LoginState = {
  error: string | null;
};

export type RegisterArenaState = {
  error: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isAgencyRole(systemRole: string) {
  return systemRole === "SUPER_ADMIN" || systemRole === "ADMIN" || systemRole === "MANAGER";
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54) || "arena";
}

async function uniqueArenaSlug(name: string) {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let index = 2;

  while (await prisma.arena.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  return slug;
}

async function registerLoginFailure(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();
  const currentAttempt = await prisma.loginAttempt.findUnique({
    where: {
      email: normalizedEmail
    }
  });

  const failedCount = (currentAttempt?.failedCount ?? 0) + 1;
  const shouldLock = failedCount >= env.loginMaxAttempts;
  const lockedUntil = shouldLock
    ? new Date(now.getTime() + env.loginLockMinutes * 60 * 1000)
    : currentAttempt?.lockedUntil ?? null;

  await prisma.loginAttempt.upsert({
    where: {
      email: normalizedEmail
    },
    update: {
      failedCount,
      lockedUntil
    },
    create: {
      email: normalizedEmail,
      failedCount,
      lockedUntil
    }
  });

  return lockedUntil;
}

async function clearLoginAttempts(email: string) {
  await prisma.loginAttempt.deleteMany({
    where: {
      email: normalizeEmail(email)
    }
  });
}

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const normalizedEmail = normalizeEmail(parsed.data.email);
  const attempt = await prisma.loginAttempt.findUnique({
    where: {
      email: normalizedEmail
    }
  });

  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    return {
      error: `Muitas tentativas inválidas. Tente novamente em ${env.loginLockMinutes} minutos.`
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail
    }
  });

  if (!user) {
    await registerLoginFailure(normalizedEmail);
    return { error: "E-mail ou senha inválidos." };
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);

  if (!passwordMatches) {
    const lockedUntil = await registerLoginFailure(normalizedEmail);

    if (lockedUntil && lockedUntil > new Date()) {
      return {
        error: `Muitas tentativas inválidas. Tente novamente em ${env.loginLockMinutes} minutos.`
      };
    }

    return { error: "E-mail ou senha inválidos." };
  }

  await clearLoginAttempts(normalizedEmail);
  await createSession(user.id);
  redirect(isAgencyRole(user.systemRole) ? "/agencia" : "/painel");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function registerArenaAction(_: RegisterArenaState, formData: FormData): Promise<RegisterArenaState> {
  const parsed = registerArenaSchema.safeParse({
    arenaName: formData.get("arenaName"),
    ownerName: formData.get("ownerName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const email = normalizeEmail(parsed.data.email);
  const existingUser = await prisma.user.findUnique({
    where: {
      email
    }
  });

  if (existingUser) {
    return { error: "Já existe uma conta com este e-mail. Entre e crie/vincule a arena pelo painel." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const slug = await uniqueArenaSlug(parsed.data.arenaName);
  const ownerPermissions = defaultPermissionsForRole("OWNER");

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name: parsed.data.ownerName,
        email,
        passwordHash,
        systemRole: "VIEWER"
      }
    });

    const arena = await tx.arena.create({
      data: {
        name: parsed.data.arenaName,
        slug,
        createdById: createdUser.id
      }
    });

    await tx.arenaMember.create({
      data: {
        userId: createdUser.id,
        arenaId: arena.id,
        role: "OWNER",
        viewPermissions: ownerPermissions.viewPermissions,
        editPermissions: ownerPermissions.editPermissions
      }
    });

    return createdUser;
  });

  await createSession(user.id);
  redirect("/painel");
}

export async function setActiveArenaAction(formData: FormData) {
  const auth = await getAuthContext();

  if (!auth) {
    redirect("/login");
  }

  const arenaId = String(formData.get("arenaId") ?? "");
  const membership = auth.memberships.find((item) => item.arenaId === arenaId);

  if (!membership) {
    throw new Error("Arena inválida para este usuário.");
  }

  await setArenaContextCookie(arenaId);
  redirect("/painel");
}

export async function setWorkspaceAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");

  if (workspaceId === "agency") {
    redirect("/agencia");
  }

  const nextFormData = new FormData();
  nextFormData.set("arenaId", workspaceId);
  await setActiveArenaAction(nextFormData);
}

export async function redirectIfAuthenticated() {
  const auth = await getAuthContext();

  if (auth) {
    redirect(isAgencyRole(auth.systemRole) ? "/agencia" : "/painel");
  }
}
