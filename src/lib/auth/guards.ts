import { requireArenaAccess } from "@/lib/auth/session";
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
    throw new Error("Sem permissao para executar esta acao.");
  }

  return auth;
}
