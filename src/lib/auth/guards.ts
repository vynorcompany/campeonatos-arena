import { requireArenaAccess, requireAuth } from "@/lib/auth/session";
import { canEditModule, canViewModule, type PermissionModule } from "@/lib/permissions";
import type { ArenaRole, SystemRole } from "@/types/auth";

const roleWeight: Record<ArenaRole, number> = {
  VIEWER: 0,
  STAFF: 1,
  ADMIN: 2,
  OWNER: 3
};

const systemWeight: Record<SystemRole, number> = {
  VIEWER: 0,
  MANAGER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3
};

export async function requireRole(minRole: ArenaRole = "STAFF") {
  const auth = await requireArenaAccess();
  const arenaRole = auth.arenaRole ?? "VIEWER";

  if (systemWeight[auth.systemRole] >= systemWeight.ADMIN) {
    return auth;
  }

  if (roleWeight[arenaRole] < roleWeight[minRole]) {
    throw new Error("Sem permissão para executar esta ação.");
  }

  return auth;
}

export async function requireModuleView(module: PermissionModule) {
  const auth = await requireArenaAccess();

  if (!canViewModule(module, auth.arenaRole, auth.systemRole, auth.viewPermissions)) {
    throw new Error("Sem permissão para visualizar este módulo.");
  }

  return auth;
}

export async function requireModuleEdit(module: PermissionModule) {
  const auth = await requireArenaAccess();

  if (!canEditModule(module, auth.arenaRole, auth.systemRole, auth.editPermissions)) {
    throw new Error("Sem permissão para alterar este módulo.");
  }

  return auth;
}

export async function requireAgencyAccess() {
  const auth = await requireAuth();

  if (auth.systemRole !== "SUPER_ADMIN" && auth.systemRole !== "ADMIN" && auth.systemRole !== "MANAGER") {
    throw new Error("Sem permissão para acessar o painel da agência.");
  }

  return auth;
}
