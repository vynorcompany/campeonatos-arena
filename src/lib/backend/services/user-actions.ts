import "server-only";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/auth/database";
import type { Prisma } from "@prisma/client";
import { requireArenaAccess, requireAuth } from "@/lib/auth/session";
import {
  removeArenaUserSchema,
  updateArenaUserRoleSchema,
  updateArenaUserSchema,
  updateOwnPasswordSchema,
  updateOwnProfileSchema
} from "@/lib/validators/user";
import { defaultPermissionsForRole, financialEntryDeletePermission, normalizePermissionModules } from "@/lib/permissions";
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

function getPermissionValues(formData: FormData, name: string, arenaRole: ArenaRole) {
  const defaults = defaultPermissionsForRole(arenaRole);
  const selected = normalizePermissionModules(formData.getAll(name).map(String));

  if (arenaRole === "OWNER" || arenaRole === "ADMIN") {
    return name === "editPermissions" ? defaults.editPermissions : defaults.viewPermissions;
  }

  if (name === "editPermissions" && formData.get("financialEntryDelete") === "1") {
    return Array.from(new Set([...selected, financialEntryDeletePermission]));
  }

  return selected;
}

function canManageUsers(arenaRole: ArenaRole | null, systemRole: SystemRole) {
  return systemRoleWeight[systemRole] >= systemRoleWeight.ADMIN || arenaRoleWeight[arenaRole ?? "VIEWER"] >= arenaRoleWeight.ADMIN;
}

function canManageOwners(arenaRole: ArenaRole | null, systemRole: SystemRole) {
  return systemRole === "SUPER_ADMIN" || arenaRole === "OWNER";
}

async function hasAnotherOwner(prisma: Prisma.TransactionClient, arenaId: string, userId: string) {
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

async function resolvePermissionProfile(prisma: Prisma.TransactionClient, arenaId: string, profileId: string | undefined, role: ArenaRole) {
  if (!profileId) return { id: null, ...defaultPermissionsForRole(role) };
  const profile = await prisma.permissionProfile.findFirst({ where: { id: profileId, arenaId, active: true }, select:{id:true,viewPermissions:true,editPermissions:true} });
  if (!profile) throw new Error("Perfil de usuário inválido ou inativo.");
  return { id: profile.id, viewPermissions: profile.viewPermissions, editPermissions: profile.editPermissions };
}

async function withArenaUserTransaction<T>(arenaId:string,run:(tx:Prisma.TransactionClient)=>Promise<T>) {
  return prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`arena-users:${arenaId}`},0))`;
    return run(tx);
  },{maxWait:20_000,timeout:20_000});
}
async function lockedManager(tx:Prisma.TransactionClient,auth:Awaited<ReturnType<typeof requireArenaAccess>>) {
  if (systemRoleWeight[auth.systemRole]>=systemRoleWeight.ADMIN) return auth;
  const member=await tx.arenaMember.findUnique({where:{userId_arenaId:{userId:auth.userId,arenaId:auth.arenaId}},select:{role:true}});
  if (!member || !canManageUsers(member.role as ArenaRole,auth.systemRole)) throw new Error("Você não tem permissão para gerenciar usuários.");
  return {...auth,arenaRole:member.role as ArenaRole};
}

export async function updateArenaUserRoleAction(formData: FormData) {
  const auth = await requireArenaAccess();

  if (!canManageUsers(auth.arenaRole, auth.systemRole)) {
    throw new Error("Você não tem permissão para gerenciar usuários.");
  }

  const caller=auth;
  return withArenaUserTransaction(auth.arenaId,async prisma=>{
    const auth=await lockedManager(prisma,caller);
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

    if (membership.role === "OWNER" && parsed.data.arenaRole !== "OWNER" && !(await hasAnotherOwner(prisma, auth.arenaId, parsed.data.userId))) {
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
        role: parsed.data.arenaRole,
        ...defaultPermissionsForRole(parsed.data.arenaRole)
      }
    });

  });
}

export async function updateArenaUserAction(formData: FormData) {
  const auth = await requireArenaAccess();

  if (!canManageUsers(auth.arenaRole, auth.systemRole)) {
    throw new Error("Você não tem permissão para gerenciar usuários.");
  }

  const caller=auth;
  return withArenaUserTransaction(auth.arenaId,async prisma=>{
    const auth=await lockedManager(prisma,caller);
    const parsed = updateArenaUserSchema.safeParse({
      userId: formData.get("userId"),
      name: formData.get("name"),
      email: formData.get("email"),
      arenaRole: formData.get("arenaRole"),
      permissionProfileId: formData.get("permissionProfileId") || undefined,
      viewPermissions: getPermissionValues(formData, "viewPermissions", formData.get("arenaRole") as ArenaRole),
      editPermissions: getPermissionValues(formData, "editPermissions", formData.get("arenaRole") as ArenaRole)
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
      select: {role:true}
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

    if (membership.role === "OWNER" && parsed.data.arenaRole !== "OWNER" && !(await hasAnotherOwner(prisma, auth.arenaId, parsed.data.userId))) {
      throw new Error("A arena precisa manter pelo menos um owner.");
    }

    const email = normalizeEmail(parsed.data.email);
    const profile = await resolvePermissionProfile(prisma, auth.arenaId, parsed.data.permissionProfileId, parsed.data.arenaRole);
    await prisma.$queryRaw`SELECT id FROM "User" WHERE id=${parsed.data.userId} FOR UPDATE`;
    const identity=await prisma.user.findUniqueOrThrow({where:{id:parsed.data.userId},select:{name:true,email:true}});
    const identityChanged=identity.name!==parsed.data.name || identity.email!==email;
    if(identityChanged && parsed.data.userId!==auth.userId && systemRoleWeight[auth.systemRole]<systemRoleWeight.ADMIN && await prisma.arenaMember.count({where:{userId:parsed.data.userId,arenaId:{not:auth.arenaId}}})) {
      throw new Error("Este usuário participa de outras arenas. Os dados pessoais devem ser alterados pela própria conta.");
    }
    const emailOwner = await prisma.user.findUnique({where:{email},select:{id:true}});

    if (emailOwner && emailOwner.id !== parsed.data.userId) {
      throw new Error("Este e-mail já está em uso por outro usuário.");
    }

    await prisma.user.update({
        where: {
          id: parsed.data.userId
        },
        data: {
          name: parsed.data.name,
          email
        }
      });
    await prisma.arenaMember.update({
        where: {
          userId_arenaId: {
            userId: parsed.data.userId,
            arenaId: auth.arenaId
          }
        },
        data: {
          role: parsed.data.arenaRole,
          permissionProfileId: profile.id,
          viewPermissions: profile.viewPermissions,
          editPermissions: profile.editPermissions
        }
      });

  });
}

export async function removeArenaUserAction(formData: FormData) {
  const auth = await requireArenaAccess();

  if (!canManageUsers(auth.arenaRole, auth.systemRole)) {
    throw new Error("Você não tem permissão para gerenciar usuários.");
  }

  const caller=auth;
  return withArenaUserTransaction(auth.arenaId,async prisma=>{
    const auth=await lockedManager(prisma,caller);
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

    if (membership.role === "OWNER" && !(await hasAnotherOwner(prisma, auth.arenaId, parsed.data.userId))) {
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

  });
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

  const user = await prisma.user.findUnique({where:{id:auth.userId},select:{id:true,passwordHash:true}});

  if (!user) {
    return { error: "Usuário não encontrado.", success: null };
  }

  const passwordMatches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);

  if (!passwordMatches) {
    return { error: "A senha atual está incorreta.", success: null };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);

  return prisma.$transaction(async tx=>{
    const changed=await tx.user.updateMany({where:{id:auth.userId,passwordHash:user.passwordHash},data:{passwordHash}});
    if(changed.count!==1)return{error:"A senha foi alterada durante esta solicitação. Entre novamente para continuar.",success:null};
    await tx.session.deleteMany({where:{userId:auth.userId}});
    await tx.accountActionToken.updateMany({where:{userId:auth.userId,kind:'RESET',usedAt:null},data:{usedAt:new Date()}});
    return{error:null,success:"Sua senha foi atualizada com sucesso."};
  });
}
