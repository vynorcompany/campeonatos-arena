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
export const financialEntryDeletePermission = "finance:delete-entry";

export const permissionAreas = [
  { title: "Agenda e reservas", module: "calendar", actions: [["calendar:view", "Visualizar grade"], ["calendar:booking:create", "Criar reserva"], ["calendar:booking:edit", "Editar reserva"], ["calendar:booking:cancel", "Cancelar reserva"], ["calendar:recurrence:release", "Liberar horário recorrente"], ["calendar:settings:manage", "Configurar quadras e preços"]] },
  { title: "Comandas", module: "pos", actions: [["pos:view", "Visualizar comandas"], ["pos:command:create", "Abrir comanda"], ["pos:command:items", "Inserir e alterar itens"], ["pos:command:finish", "Finalizar comanda"], ["pos:command:delete", "Excluir comanda"]] },
  { title: "Clientes", module: "players", actions: [["players:view", "Visualizar clientes"], ["players:create", "Criar cliente"], ["players:edit", "Editar cliente"], ["players:balance", "Ajustar saldo"], ["players:merge", "Mesclar clientes"], ["players:import", "Importar clientes"]] },
  { title: "Financeiro", module: "finance", actions: [["finance:receivable:view", "Ver contas a receber"], ["finance:receivable:create", "Criar contas a receber"], ["finance:receivable:edit", "Editar contas a receber"], ["finance:receivable:settle", "Quitar contas a receber"], ["finance:payable:view", "Ver contas a pagar"], ["finance:payable:create", "Criar contas a pagar"], ["finance:payable:edit", "Editar contas a pagar"], ["finance:payable:settle", "Quitar contas a pagar"], ["finance:delete-entry", "Excluir lançamentos"], ["finance:reports:view", "Ver relatórios"], ["finance:settings:manage", "Configurações financeiras"]] },
  { title: "Professores e aulas", module: "teachers", actions: [["teachers:view", "Visualizar professores"], ["teachers:manage", "Gerenciar professores"], ["teachers:plans", "Gerenciar planos"], ["teachers:classes", "Gerenciar turmas e alunos"], ["teachers:payable", "Gerar a pagar de professor"], ["lessons:manage", "Registrar aulas"]] },
  { title: "Torneios e ligas", module: "tournaments", actions: [["tournaments:view", "Visualizar torneios"], ["tournaments:manage", "Gerenciar torneios e ligas"], ["tournaments:publish", "Publicar eventos"], ["tournaments:results", "Lançar resultados"], ["tournaments:rankings", "Gerenciar rankings"]] },
  { title: "Produtos e estoque", module: "stock", actions: [["stock:view", "Visualizar produtos"], ["stock:manage", "Gerenciar produtos"], ["stock:adjust", "Ajustar estoque"]] },
  { title: "Sistema", module: "arena", actions: [["arena:settings", "Configurações da arena"], ["arena:portal", "Configurar Portal do Atleta"], ["users:manage", "Gerenciar usuários e perfis"], ["support:view", "Ver suporte"]] }
] as const;

const permissionModuleAliases: Record<string, PermissionModule> = { pos: "pos", players: "players", calendar: "calendar", finance: "finance", teachers: "teachers", lessons: "lessons", tournaments: "tournaments", stock: "stock", arena: "arena", users: "users", support: "support" };
const allPermissionKeys: Set<string> = new Set([...allPermissionModules, ...permissionAreas.flatMap((area) => area.actions.map(([key]) => key))]);

const alwaysVisibleModules: PermissionModule[] = ["dashboard", "support"];

export function normalizePermissionModules(values: string[]) {
  return Array.from(new Set(values.filter((value) => allPermissionKeys.has(value))));
}

function includesModulePermission(permissions: string[], module: PermissionModule) {
  return permissions.includes(module) || permissions.some((permission) => permissionModuleAliases[permission.split(":")[0]] === module);
}

export function hasPermissionKey(permissions: string[], key: string) {
  const module = permissionModuleAliases[key.split(":")[0]];
  return permissions.includes(key) || (module ? permissions.includes(module) : false);
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
  if (systemRole === "SUPER_ADMIN" || systemRole === "ADMIN" || role === "OWNER") {
    return true;
  }

  return alwaysVisibleModules.includes(module) || includesModulePermission(viewPermissions, module);
}

export function canEditModule(module: PermissionModule, role: string | null, systemRole: string, editPermissions: string[]) {
  if (systemRole === "SUPER_ADMIN" || systemRole === "ADMIN" || role === "OWNER") {
    return true;
  }

  return includesModulePermission(editPermissions, module);
}

export function canDeleteFinancialEntries(role: string | null, systemRole: string, editPermissions: string[]) {
  if (systemRole === "SUPER_ADMIN" || systemRole === "ADMIN" || role === "OWNER") {
    return true;
  }

  return editPermissions.includes(financialEntryDeletePermission);
}
