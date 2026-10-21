const migratedProfile = /^Migrado · (OWNER|ADMIN|STAFF|VIEWER) \S+$/;

const roleLabels = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  STAFF: "Colaborador",
  VIEWER: "Visualização"
} as const;

export function permissionProfileLabel(name: string) {
  const match = migratedProfile.exec(name);
  if (!match) return name;
  return `Acesso legado · ${roleLabels[match[1] as keyof typeof roleLabels]}`;
}

export function permissionProfileOptionLabel(name: string) {
  const match = migratedProfile.exec(name);
  if (!match) return name;
  return `Legado · ${roleLabels[match[1] as keyof typeof roleLabels]}`;
}

export function isMigratedPermissionProfile(name: string) {
  return migratedProfile.test(name);
}
