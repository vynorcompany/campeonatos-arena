import { requireArenaAccess, requireAuth } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { canDeleteFinancialEntries, canEditModule, canManageTournamentMatches, canManageWhatsApp, canPerformPermission, canRecordTournamentMatchResult, canSendWhatsApp, canViewModule, type PermissionModule } from "@/lib/permissions";
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

function isAgencyRole(role: SystemRole) {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
}

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
    notFound();
  }

  return auth;
}

export async function requireFinanceView(area: "receivable" | "payable" | "reports") {
  const auth = await requireArenaAccess();
  if (!canPerformPermission(`finance:${area}:view`, auth.arenaRole, auth.systemRole, auth.viewPermissions)) {
    notFound();
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

export async function requireTournamentMatchEdit() {
  const auth = await requireArenaAccess();
  if (!canManageTournamentMatches(auth.arenaRole, auth.systemRole, auth.viewPermissions, auth.editPermissions)) {
    throw new Error("Sem permissão para gerenciar jogos de torneios.");
  }
  return auth;
}

export async function requireTournamentResultEdit() {
  const auth = await requireArenaAccess();
  if (!canRecordTournamentMatchResult(auth.arenaRole, auth.systemRole, auth.viewPermissions, auth.editPermissions)) {
    throw new Error("Sem permissão para lançar resultados de torneios.");
  }
  return auth;
}

export async function requireWhatsAppSend() {
  const auth = await requireArenaAccess();
  if (!canSendWhatsApp(auth.arenaRole, auth.systemRole, auth.editPermissions)) {
    throw new Error("Sem permissão para enviar mensagens no WhatsApp.");
  }
  return auth;
}

export async function requireWhatsAppManage() {
  const auth = await requireArenaAccess();
  if (!canManageWhatsApp(auth.arenaRole, auth.systemRole, auth.editPermissions)) {
    throw new Error("Sem permissão para gerenciar o WhatsApp.");
  }
  return auth;
}

export async function requirePermission(key: string, mode: "view" | "edit" = "edit") {
  const auth = await requireArenaAccess();
  const permissions = mode === "view" ? auth.viewPermissions : auth.editPermissions;
  if (!canPerformPermission(key, auth.arenaRole, auth.systemRole, permissions)) throw new Error("Sem permissão para executar esta ação.");
  return auth;
}

export async function requireFinancialEntryDelete() {
  const auth = await requireArenaAccess();

  if (!canDeleteFinancialEntries(auth.arenaRole, auth.systemRole, auth.editPermissions)) {
    throw new Error("Sem permissão para excluir lançamentos financeiros.");
  }

  return auth;
}

export async function requireAgencyAccess() {
  const auth = await requireAuth();

  if (!isAgencyRole(auth.systemRole)) {
    throw new Error("Sem permissão para acessar o painel da agência.");
  }

  return auth;
}

export async function requireAgencyPageAccess() {
  const auth = await requireAuth();

  if (!isAgencyRole(auth.systemRole)) {
    notFound();
  }

  return auth;
}
