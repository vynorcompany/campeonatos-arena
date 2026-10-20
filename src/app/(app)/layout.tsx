import { AppShell } from "@/components/layout/app-shell";
import { requireArenaAccess } from "@/lib/auth/session";
import { allPermissionModules, canEditModule, canPerformPermission, canViewModule } from "@/lib/permissions";
import { arenaDatabase } from "@/lib/arena-database";
import { getAgencyDelinquency } from "@/lib/finance/agency-delinquency";
import { getActiveWhatsAppUnreadCount } from "@/lib/whatsapp-active-account";

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
  const [notifications, whatsappUnreadCount, billingAlert] = await Promise.all([
    arenaDatabase(auth.arenaId).$transaction(
      (tx) => tx.arenaNotification.findMany({ where: { arenaId: auth.arenaId, readAt: null }, select: { id: true, title: true, message: true, href: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 8 }),
      { maxWait: 20_000, timeout: 10_000 }
    ),
    getActiveWhatsAppUnreadCount(auth.arenaId),
    getAgencyDelinquency(auth.arenaId),
  ]);

  return (
    <AppShell
      arenaName={auth.arenaName ?? "Arena"}
      arenaLogoUrl={auth.memberships.find((membership) => membership.arenaId === auth.arenaId)?.arenaLogoUrl ?? "/arena-profile.jpg"}
      activeArenaId={auth.arenaId}
      memberships={auth.memberships}
      userName={auth.userName}
      userRole={auth.arenaRole ?? auth.systemRole}
      canManageUsers={canManageUsers}
      canManageFinancialSettings={canPerformPermission("finance:settings:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)}
      financeView={{
        receivable: canPerformPermission("finance:receivable:view", auth.arenaRole, auth.systemRole, auth.viewPermissions),
        payable: canPerformPermission("finance:payable:view", auth.arenaRole, auth.systemRole, auth.viewPermissions),
        reports: canPerformPermission("finance:reports:view", auth.arenaRole, auth.systemRole, auth.viewPermissions),
      }}
      canEditStock={canEditModule("stock", auth.arenaRole, auth.systemRole, auth.editPermissions)}
      visibleModules={visibleModules}
      canAccessAgency={canAccessAgency}
      whatsappUnreadCount={whatsappUnreadCount}
      notifications={notifications}
      billingAlert={billingAlert}
    >
      {children}
    </AppShell>
  );
}
