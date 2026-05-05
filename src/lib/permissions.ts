export const permissionModules = [
  { key: "dashboard", label: "Dashboard", href: "/painel" },
  { key: "tournaments", label: "Torneios", href: "/torneios" },
  { key: "players", label: "Jogadores", href: "/jogadores" },
  { key: "pairs", label: "Duplas", href: "/duplas" },
  { key: "groups", label: "Grupos", href: "/grupos" },
  { key: "matches", label: "Jogos", href: "/jogos" },
  { key: "tv", label: "Tela da TV", href: "/proximos-jogos" },
  { key: "calendar", label: "Calendário", href: "/calendario" },
  { key: "lessons", label: "Aulas", href: "/aulas" },
  { key: "students", label: "Alunos", href: "/aulas/alunos" },
  { key: "teachers", label: "Professores", href: "/professores" },
  { key: "pos", label: "PDV", href: "/pdv" },
  { key: "stock", label: "Estoque", href: "/pdv/estoque" },
  { key: "finance", label: "Financeiro", href: "/financeiro" },
  { key: "arena", label: "Arena", href: "/arena" },
  { key: "users", label: "Usuários", href: "/usuarios" },
  { key: "support", label: "Suporte", href: "/suporte" }
] as const;

export type PermissionModule = (typeof permissionModules)[number]["key"];

export const allPermissionModules = permissionModules.map((module) => module.key);

const alwaysVisibleModules: PermissionModule[] = ["dashboard", "support"];

export function normalizePermissionModules(values: string[]) {
  const allowed = new Set(allPermissionModules);
  return Array.from(new Set(values.filter((value): value is PermissionModule => allowed.has(value as PermissionModule))));
}

export function defaultPermissionsForRole(role: string) {
  if (role === "OWNER" || role === "ADMIN") {
    return {
      viewPermissions: allPermissionModules,
      editPermissions: allPermissionModules
    };
  }

  if (role === "VIEWER") {
    return {
      viewPermissions: ["dashboard", "calendar", "tournaments", "players", "matches", "tv"] satisfies PermissionModule[],
      editPermissions: [] satisfies PermissionModule[]
    };
  }

  return {
    viewPermissions: allPermissionModules.filter((module) => module !== "users"),
    editPermissions: allPermissionModules.filter((module) => module !== "users")
  };
}

export function canViewModule(module: PermissionModule, role: string | null, systemRole: string, viewPermissions: string[]) {
  if (systemRole === "SUPER_ADMIN" || systemRole === "ADMIN" || role === "OWNER" || role === "ADMIN") {
    return true;
  }

  return alwaysVisibleModules.includes(module) || viewPermissions.includes(module);
}

export function canEditModule(module: PermissionModule, role: string | null, systemRole: string, editPermissions: string[]) {
  if (systemRole === "SUPER_ADMIN" || systemRole === "ADMIN" || role === "OWNER" || role === "ADMIN") {
    return true;
  }

  return editPermissions.includes(module);
}
