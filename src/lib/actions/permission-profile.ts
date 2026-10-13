"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
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

function revalidateProfiles() {
  revalidatePath("/arena");
  revalidatePath("/painel");
}

export async function createPermissionProfileAction(formData: FormData) {
  const auth = await requireRole("ADMIN");
  const values = profileValues(formData);
  const profile = await prisma.permissionProfile.create({ data: { ...values, arenaId: auth.arenaId } });
  revalidateProfiles();
  redirect(`/arena/perfis/${profile.id}`);
}

export async function updatePermissionProfileAction(formData: FormData) {
  const auth = await requireRole("ADMIN");
  const profileId = String(formData.get("profileId") ?? "");
  const values = profileValues(formData);
  const profile = await prisma.permissionProfile.findFirst({ where: { id: profileId, arenaId: auth.arenaId } });
  if (!profile) throw new Error("Perfil não encontrado nesta arena.");
  await prisma.permissionProfile.update({ where: { id: profile.id }, data: values });
  revalidateProfiles();
  revalidatePath(`/arena/perfis/${profile.id}`);
}

export async function deletePermissionProfileAction(formData: FormData) {
  const auth = await requireRole("ADMIN");
  const profileId = String(formData.get("profileId") ?? "");
  const profile = await prisma.permissionProfile.findFirst({ where: { id: profileId, arenaId: auth.arenaId } });
  if (!profile) throw new Error("Perfil não encontrado nesta arena.");
  const members = await prisma.arenaMember.count({ where: { permissionProfileId: profile.id } });
  if (members) throw new Error("Remova ou altere o perfil dos usuários vinculados antes de excluir este perfil.");
  await prisma.permissionProfile.delete({ where: { id: profile.id } });
  revalidateProfiles();
  redirect("/arena?section=profiles");
}

export async function ensureArenaPermissionProfiles(arenaId: string) {
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
}
