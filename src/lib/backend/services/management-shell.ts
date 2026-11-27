import "server-only";
import type { AuthContext } from "@/lib/backend/services/management-session";
import { allPermissionModules, canViewModule } from "@/lib/permissions";
import { arenaDatabase } from "@/lib/arena-database";
import { refreshLoyaltyNotifications } from "@/lib/services/refresh-loyalty-notifications";
import { loyaltyNotificationType } from "@/lib/services/client-loyalty-notifications";
import { getAgencyDelinquency } from "@/lib/finance/agency-delinquency";
import { getActiveWhatsAppUnreadCount } from "@/lib/whatsapp-active-account";
import { managementShellSchema } from "@/lib/backend/contracts/management-shell";

export async function resolveManagementShell(auth: AuthContext & { arenaId: string }) {
  const visibleModules = allPermissionModules.filter(module => canViewModule(module, auth.arenaRole, auth.systemRole, auth.viewPermissions));
  if (visibleModules.includes('players')) await refreshLoyaltyNotifications(auth.arenaId);
  const [notifications, whatsappUnreadCount, billingAlert, comandaRequestCount] = await Promise.all([
    arenaDatabase(auth.arenaId).$transaction(
      tx => tx.arenaNotification.findMany({ where: { arenaId: auth.arenaId, readAt: null, type: { notIn: ['SYSTEM_RECOVERY', ...(!visibleModules.includes('players') ? [loyaltyNotificationType] : [])] } }, select: { id: true, title: true, message: true, href: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 8 }),
      { maxWait: 20_000, timeout: 10_000 },
    ),
    visibleModules.includes('support') ? getActiveWhatsAppUnreadCount(auth.arenaId) : Promise.resolve(0),
    getAgencyDelinquency(auth.arenaId),
    visibleModules.includes('pos') ? arenaDatabase(auth.arenaId).arenaNotification.count({ where: { arenaId: auth.arenaId, readAt: null, type: { in: ['COMANDA_OPEN_REQUEST', 'COMANDA_REQUEST', 'COMANDA_CLOSE_REQUEST'] } } }) : Promise.resolve(0),
  ]);
  return managementShellSchema.parse({
    notifications: notifications.map(item => ({ ...item, createdAt: item.createdAt.toISOString() })), whatsappUnreadCount, comandaRequestCount,
    billingAlert: billingAlert ? { id: billingAlert.id, daysRemaining: billingAlert.daysRemaining, deadline: billingAlert.deadline.toISOString(), checkoutUrl: billingAlert.checkoutUrl } : null,
  });
}
