"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getAuthContext, setArenaContextCookie } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { loginSchema } from "@/lib/validators/auth";

export type LoginState = {
  error: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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
  redirect("/painel");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
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

export async function redirectIfAuthenticated() {
  const auth = await getAuthContext();

  if (auth) {
    redirect("/painel");
  }
}
