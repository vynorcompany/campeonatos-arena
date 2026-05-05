import { AppShell } from "@/components/layout/app-shell";
import { requireArenaAccess } from "@/lib/auth/session";
import { allPermissionModules, canViewModule } from "@/lib/permissions";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireArenaAccess();
  const canManageUsers =
    auth.systemRole === "SUPER_ADMIN" ||
    auth.systemRole === "ADMIN" ||
    auth.arenaRole === "OWNER" ||
    auth.arenaRole === "ADMIN";
  const visibleModules = allPermissionModules.filter((module) =>
    canViewModule(module, auth.arenaRole, auth.systemRole, auth.viewPermissions)
  );
  const canAccessAgency = auth.systemRole === "SUPER_ADMIN" || auth.systemRole === "ADMIN" || auth.systemRole === "MANAGER";

  return (
    <AppShell
      arenaName={auth.arenaName ?? "Arena"}
      arenaLogoUrl={auth.memberships.find((membership) => membership.arenaId === auth.arenaId)?.arenaLogoUrl ?? "/arena-profile.jpg"}
      activeArenaId={auth.arenaId}
      memberships={auth.memberships}
      userName={auth.userName}
      userRole={auth.arenaRole ?? auth.systemRole}
      canManageUsers={canManageUsers}
      visibleModules={visibleModules}
      canAccessAgency={canAccessAgency}
    >
      {children}
    </AppShell>
  );
}
