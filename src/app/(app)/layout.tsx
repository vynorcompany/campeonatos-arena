import { AppShell } from "@/components/layout/app-shell";
import { requireArenaAccess } from "@/lib/auth/session";
import { allPermissionModules, canViewModule } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
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
  const [notifications, whatsappUnreadCount, billingAlert] = await Promise.all([prisma.arenaNotification.findMany({ where: { arenaId: auth.arenaId, readAt: null }, select: { id: true, title: true, message: true, href: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 8 }), getActiveWhatsAppUnreadCount(auth.arenaId), getAgencyDelinquency(auth.arenaId)]);

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
      whatsappUnreadCount={whatsappUnreadCount}
      notifications={notifications}
      billingAlert={billingAlert}
    >
      {children}
    </AppShell>
  );
}
