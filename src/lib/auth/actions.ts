"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getAuthContext, setArenaContextCookie } from "@/lib/auth/session";
import { loginSchema, registerArenaSchema } from "@/lib/validators/auth";
import { defaultArenaPermissionProfiles, defaultPermissionsForRole } from "@/lib/permissions";
import { agencyBillingDay } from "@/lib/finance/agency-billing-dates";
import { activeLoginLock, clearLoginFailures, recordFailedLogin } from "@/lib/auth/login-attempts";

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

async function uniqueArenaSlug(name: string, firstSuffix = 1) {
  const baseSlug = slugify(name);
  let index = Math.max(1, firstSuffix);
  let slug = index === 1 ? baseSlug : `${baseSlug}-${index}`;

  while (await prisma.arena.findUnique({ where: { slug } })) {
    index += 1;
    slug = `${baseSlug}-${index}`;
  }

  return slug;
}

function isUniqueConflict(error: unknown, field: string) {
  if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") return false;
  const target = "meta" in error && error.meta && typeof error.meta === "object" && "target" in error.meta
    ? error.meta.target
    : null;
  return (Array.isArray(target) ? target : [target]).some((part) => typeof part === "string" && part.toLowerCase().includes(field.toLowerCase()));
}

function getRemainingLockMinutes(lockedUntil: Date, now = new Date()) {
  const diffMs = lockedUntil.getTime() - now.getTime();
  return Math.max(1, Math.ceil(diffMs / (60 * 1000)));
}

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  if (String(formData.get("contactWebsite") ?? "").trim()) return { error: "Não foi possível validar o formulário. Recarregue a página e tente novamente." };
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const normalizedEmail = normalizeEmail(parsed.data.email);
  const lockedUntil = await activeLoginLock(normalizedEmail);
  if (lockedUntil) {
    return {
      error: `Muitas tentativas inválidas. Tente novamente em ${getRemainingLockMinutes(lockedUntil)} minuto(s).`
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail
    }
  });

  if (!user) {
    await recordFailedLogin(normalizedEmail);
    return { error: "E-mail ou senha inválidos." };
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);

  if (!passwordMatches) {
    const lockedUntil = await recordFailedLogin(normalizedEmail);

    if (lockedUntil && lockedUntil > new Date()) {
      return {
        error: `Muitas tentativas inválidas. Tente novamente em ${getRemainingLockMinutes(lockedUntil)} minuto(s).`
      };
    }

    return { error: "E-mail ou senha inválidos." };
  }

  await clearLoginFailures(normalizedEmail);
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
  const ownerPermissions = defaultPermissionsForRole("OWNER");

  let userId: string | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = await uniqueArenaSlug(parsed.data.arenaName, attempt + 1);
    try {
      userId = await prisma.$transaction(async (tx) => {
        const trialPlan = await tx.agencyPlan.findUnique({ where: { id: "agency-trial-7-days" } });
        if (!trialPlan) return null;
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

        const trialStartedAt = new Date();
        await tx.agencySubscription.create({ data: {
          arenaId: arena.id,
          planId: trialPlan.id,
          startsAt: trialStartedAt,
          trialEndsAt: new Date(trialStartedAt.getTime() + 7 * 24 * 60 * 60 * 1000),
          billingDay: agencyBillingDay(new Date(trialStartedAt.getTime() + 7 * 24 * 60 * 60 * 1000)),
          status: "ACTIVE"
        } });

        await tx.permissionProfile.createMany({
          data: defaultArenaPermissionProfiles.map((profile) => ({
            arenaId: arena.id,
            ...profile,
            viewPermissions: [...profile.viewPermissions],
            editPermissions: [...profile.editPermissions]
          }))
        });
        const administratorProfile = await tx.permissionProfile.findUniqueOrThrow({
          where: { arenaId_name: { arenaId: arena.id, name: "Administrador" } },
          select: { id: true }
        });

        await tx.arenaMember.create({
          data: {
            userId: createdUser.id,
            arenaId: arena.id,
            role: "OWNER",
            viewPermissions: ownerPermissions.viewPermissions,
            editPermissions: ownerPermissions.editPermissions,
            permissionProfileId: administratorProfile.id
          }
        });

        return createdUser.id;
      });
      if (!userId) return { error: "O plano de avaliação não está configurado. Entre em contato com o suporte." };
      break;
    } catch (error) {
      if (isUniqueConflict(error, "email")) return { error: "Já existe uma conta com este e-mail. Entre e crie/vincule a arena pelo painel." };
      if (isUniqueConflict(error, "slug")) continue;
      throw error;
    }
  }

  if (!userId) return { error: "Não foi possível reservar o nome da arena. Tente novamente." };
  await createSession(userId);
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


