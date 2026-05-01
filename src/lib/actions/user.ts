"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireArenaAccess, requireAuth } from "@/lib/auth/session";
import {
  createArenaUserSchema,
  removeArenaUserSchema,
  resetArenaUserPasswordSchema,
  updateArenaUserRoleSchema,
  updateArenaUserSchema,
  updateOwnPasswordSchema,
  updateOwnProfileSchema
} from "@/lib/validators/user";
import type { ArenaRole, SystemRole } from "@/types/auth";

export type UserActionState = {
  error: string | null;
  success: string | null;
};

const initialErrorMessage = "Não foi possível concluir a operação.";

const arenaRoleWeight: Record<ArenaRole, number> = {
  VIEWER: 0,
  STAFF: 1,
  ADMIN: 2,
  OWNER: 3
};

const systemRoleWeight: Record<SystemRole, number> = {
  VIEWER: 0,
  MANAGER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function canManageUsers(arenaRole: ArenaRole | null, systemRole: SystemRole) {
  return systemRoleWeight[systemRole] >= systemRoleWeight.ADMIN || arenaRoleWeight[arenaRole ?? "VIEWER"] >= arenaRoleWeight.ADMIN;
}

function canManageOwners(arenaRole: ArenaRole | null, systemRole: SystemRole) {
  return systemRole === "SUPER_ADMIN" || arenaRole === "OWNER";
}

function revalidateUserRoutes() {
  revalidatePath("/painel");
  revalidatePath("/usuarios");
  revalidatePath("/minha-conta");
}

async function hasAnotherOwner(arenaId: string, userId: string) {
  const ownerCount = await prisma.arenaMember.count({
    where: {
      arenaId,
      role: "OWNER",
      NOT: {
        userId
      }
    }
  });

  return ownerCount > 0;
}

export async function createArenaUserAction(_: UserActionState, formData: FormData): Promise<UserActionState> {
  const auth = await requireArenaAccess();

  if (!canManageUsers(auth.arenaRole, auth.systemRole)) {
    return { error: "Você não tem permissão para gerenciar usuários.", success: null };
  }

  const parsed = createArenaUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    arenaRole: formData.get("arenaRole")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? initialErrorMessage, success: null };
  }

  if (parsed.data.arenaRole === "OWNER" && !canManageOwners(auth.arenaRole, auth.systemRole)) {
    return { error: "Somente um owner pode cadastrar outro owner.", success: null };
  }

  const email = normalizeEmail(parsed.data.email);
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    const existingMembership = await prisma.arenaMember.findUnique({
      where: {
        userId_arenaId: {
          userId: existingUser.id,
          arenaId: auth.arenaId
        }
      }
    });

    if (existingMembership) {
      return { error: "Esse usuário já faz parte da arena atual.", success: null };
    }

    await prisma.arenaMember.create({
      data: {
        userId: existingUser.id,
        arenaId: auth.arenaId,
        role: parsed.data.arenaRole
      }
    });

    revalidateUserRoutes();
    return { error: null, success: "Usuário existente vinculado à arena com sucesso." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      systemRole: "VIEWER",
      memberships: {
        create: {
          arenaId: auth.arenaId,
          role: parsed.data.arenaRole
        }
      }
    }
  });

  revalidateUserRoutes();
  return { error: null, success: "Usuário criado com acesso liberado para a arena." };
}

export async function updateArenaUserRoleAction(formData: FormData) {
  const auth = await requireArenaAccess();

  if (!canManageUsers(auth.arenaRole, auth.systemRole)) {
    throw new Error("Você não tem permissão para gerenciar usuários.");
  }

  const parsed = updateArenaUserRoleSchema.safeParse({
    userId: formData.get("userId"),
    arenaRole: formData.get("arenaRole")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? initialErrorMessage);
  }

  if (parsed.data.userId === auth.userId) {
    throw new Error("Altere seu próprio papel por outro owner para evitar perda de acesso.");
  }

  const membership = await prisma.arenaMember.findUnique({
    where: {
      userId_arenaId: {
        userId: parsed.data.userId,
        arenaId: auth.arenaId
      }
    }
  });

  if (!membership) {
    throw new Error("Usuário não encontrado nesta arena.");
  }

  if ((membership.role === "OWNER" || parsed.data.arenaRole === "OWNER") && !canManageOwners(auth.arenaRole, auth.systemRole)) {
    throw new Error("Somente um owner pode alterar acessos de owner.");
  }

  if (membership.role === "OWNER" && parsed.data.arenaRole !== "OWNER" && !(await hasAnotherOwner(auth.arenaId, parsed.data.userId))) {
    throw new Error("A arena precisa manter pelo menos um owner.");
  }

  await prisma.arenaMember.update({
    where: {
      userId_arenaId: {
        userId: parsed.data.userId,
        arenaId: auth.arenaId
      }
    },
    data: {
      role: parsed.data.arenaRole
    }
  });

  revalidateUserRoutes();
}

export async function updateArenaUserAction(formData: FormData) {
  const auth = await requireArenaAccess();

  if (!canManageUsers(auth.arenaRole, auth.systemRole)) {
    throw new Error("Você não tem permissão para gerenciar usuários.");
  }

  const parsed = updateArenaUserSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    email: formData.get("email"),
    arenaRole: formData.get("arenaRole")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? initialErrorMessage);
  }

  const membership = await prisma.arenaMember.findUnique({
    where: {
      userId_arenaId: {
        userId: parsed.data.userId,
        arenaId: auth.arenaId
      }
    },
    include: {
      user: true
    }
  });

  if (!membership) {
    throw new Error("Usuário não encontrado nesta arena.");
  }

  if (parsed.data.userId === auth.userId && membership.role !== parsed.data.arenaRole) {
    throw new Error("Altere seu próprio papel por outro owner para evitar perda de acesso.");
  }

  if ((membership.role === "OWNER" || parsed.data.arenaRole === "OWNER") && !canManageOwners(auth.arenaRole, auth.systemRole)) {
    throw new Error("Somente um owner pode alterar acessos de owner.");
  }

  if (membership.role === "OWNER" && parsed.data.arenaRole !== "OWNER" && !(await hasAnotherOwner(auth.arenaId, parsed.data.userId))) {
    throw new Error("A arena precisa manter pelo menos um owner.");
  }

  const email = normalizeEmail(parsed.data.email);
  const emailOwner = await prisma.user.findUnique({
    where: {
      email
    }
  });

  if (emailOwner && emailOwner.id !== parsed.data.userId) {
    throw new Error("Este e-mail já está em uso por outro usuário.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: parsed.data.userId
      },
      data: {
        name: parsed.data.name,
        email
      }
    }),
    prisma.arenaMember.update({
      where: {
        userId_arenaId: {
          userId: parsed.data.userId,
          arenaId: auth.arenaId
        }
      },
      data: {
        role: parsed.data.arenaRole
      }
    })
  ]);

  revalidateUserRoutes();
}

export async function removeArenaUserAction(formData: FormData) {
  const auth = await requireArenaAccess();

  if (!canManageUsers(auth.arenaRole, auth.systemRole)) {
    throw new Error("Você não tem permissão para gerenciar usuários.");
  }

  const parsed = removeArenaUserSchema.safeParse({
    userId: formData.get("userId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? initialErrorMessage);
  }

  if (parsed.data.userId === auth.userId) {
    throw new Error("Você não pode remover o próprio acesso por aqui.");
  }

  const membership = await prisma.arenaMember.findUnique({
    where: {
      userId_arenaId: {
        userId: parsed.data.userId,
        arenaId: auth.arenaId
      }
    }
  });

  if (!membership) {
    throw new Error("Usuário não encontrado nesta arena.");
  }

  if (membership.role === "OWNER" && !canManageOwners(auth.arenaRole, auth.systemRole)) {
    throw new Error("Somente um owner pode remover outro owner.");
  }

  if (membership.role === "OWNER" && !(await hasAnotherOwner(auth.arenaId, parsed.data.userId))) {
    throw new Error("A arena precisa manter pelo menos um owner.");
  }

  await prisma.arenaMember.delete({
    where: {
      userId_arenaId: {
        userId: parsed.data.userId,
        arenaId: auth.arenaId
      }
    }
  });

  revalidateUserRoutes();
}

export async function resetArenaUserPasswordAction(formData: FormData) {
  const auth = await requireArenaAccess();

  if (!canManageUsers(auth.arenaRole, auth.systemRole)) {
    throw new Error("Você não tem permissão para gerenciar usuários.");
  }

  const parsed = resetArenaUserPasswordSchema.safeParse({
    userId: formData.get("userId"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? initialErrorMessage);
  }

  const membership = await prisma.arenaMember.findUnique({
    where: {
      userId_arenaId: {
        userId: parsed.data.userId,
        arenaId: auth.arenaId
      }
    }
  });

  if (!membership) {
    throw new Error("Usuário não encontrado nesta arena.");
  }

  if (membership.role === "OWNER" && !canManageOwners(auth.arenaRole, auth.systemRole)) {
    throw new Error("Somente um owner pode redefinir a senha de outro owner.");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.update({
    where: {
      id: parsed.data.userId
    },
    data: {
      passwordHash
    }
  });

  revalidateUserRoutes();
}

export async function updateOwnProfileAction(_: UserActionState, formData: FormData): Promise<UserActionState> {
  const auth = await requireAuth();
  const parsed = updateOwnProfileSchema.safeParse({
    name: formData.get("name")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? initialErrorMessage, success: null };
  }

  await prisma.user.update({
    where: {
      id: auth.userId
    },
    data: {
      name: parsed.data.name
    }
  });

  revalidateUserRoutes();
  return { error: null, success: "Seu perfil foi atualizado." };
}

export async function updateOwnPasswordAction(_: UserActionState, formData: FormData): Promise<UserActionState> {
  const auth = await requireAuth();
  const parsed = updateOwnPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? initialErrorMessage, success: null };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: auth.userId
    }
  });

  if (!user) {
    return { error: "Usuário não encontrado.", success: null };
  }

  const passwordMatches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);

  if (!passwordMatches) {
    return { error: "A senha atual está incorreta.", success: null };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);

  await prisma.user.update({
    where: {
      id: auth.userId
    },
    data: {
      passwordHash
    }
  });

  revalidateUserRoutes();
  return { error: null, success: "Sua senha foi atualizada com sucesso." };
}
