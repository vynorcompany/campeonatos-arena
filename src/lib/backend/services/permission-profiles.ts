import "server-only";

import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { defaultArenaPermissionProfiles, defaultPermissionsForRole, normalizePermissionModules } from "@/lib/permissions";

function profilePermissions(formData: FormData, name: "viewPermissions" | "editPermissions") {
  return normalizePermissionModules(formData.getAll(name).map(String));
}

function profileValues(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (name.length < 2) throw new Error("Informe um nome para o perfil.");
  const editPermissions = profilePermissions(formData, "editPermissions");
  if (formData.get("financialEntryDelete")) editPermissions.push("finance:delete-entry");
  return { name, description, viewPermissions: profilePermissions(formData, "viewPermissions"), editPermissions: normalizePermissionModules(editPermissions) };
}

export async function createPermissionProfileAction(formData: FormData) {
  const auth = await requireRole("ADMIN");
  const values = profileValues(formData);
  const profile = await prisma.permissionProfile.create({ data: { ...values, arenaId: auth.arenaId } });
  return {profileId:profile.id};
}

export async function updatePermissionProfileAction(formData: FormData) {
  const auth = await requireRole("ADMIN");
  const profileId = String(formData.get("profileId") ?? "");
  const values = profileValues(formData);
  const profile = await prisma.permissionProfile.findFirst({ where: { id: profileId, arenaId: auth.arenaId } });
  if (!profile) throw new Error("Perfil não encontrado nesta arena.");
  await prisma.permissionProfile.update({ where: { id: profile.id }, data: values });
  return {profileId:profile.id};
}

export async function deletePermissionProfileAction(formData: FormData) {
  const auth = await requireRole("ADMIN");
  const profileId = String(formData.get("profileId") ?? "");
  return withArenaTransaction(auth.arenaId, async tx => {
    const profiles = await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "PermissionProfile" WHERE id = ${profileId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    if (!profiles.length) throw new Error("Perfil não encontrado nesta arena.");
    const members = await tx.arenaMember.count({where:{permissionProfileId:profiles[0].id}});
    if (members) throw new Error("Remova ou altere o perfil dos usuários vinculados antes de excluir este perfil.");
    await tx.permissionProfile.delete({where:{id:profiles[0].id}});
    return {profileId:profiles[0].id};
  });
}

export async function ensureArenaPermissionProfiles(arenaId: string) {
  return withArenaTransaction(arenaId, async prisma => {
    await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`permission-profiles:${arenaId}`}, 0))`;
    await prisma.permissionProfile.createMany({
      data: defaultArenaPermissionProfiles.map((profile) => ({
        arenaId,
        ...profile,
        viewPermissions: [...profile.viewPermissions],
        editPermissions: [...profile.editPermissions]
      })),
      skipDuplicates: true
    });
    const members = await prisma.arenaMember.findMany({ where: { arenaId, permissionProfileId: null } });
    for (const member of members) {
      const defaults = member.viewPermissions.length || member.editPermissions.length
        ? { viewPermissions: member.viewPermissions, editPermissions: member.editPermissions }
        : defaultPermissionsForRole(member.role);
      const name = `Migrado · ${member.role} ${member.id}`;
      const profile = await prisma.permissionProfile.upsert({
        where: { arenaId_name: { arenaId, name } },
        create: { arenaId, name, description: "Perfil criado automaticamente para preservar o acesso existente.", ...defaults },
        update: {}
      });
      await prisma.arenaMember.updateMany({ where: { id: member.id, arenaId, permissionProfileId: null }, data: { permissionProfileId: profile.id } });
    }
  }, {maxWait:20_000,timeout:20_000});
}
