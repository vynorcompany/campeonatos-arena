import { viewStyles } from "./app-shell.utilities";
import Image from "next/image";
import Link from "next/link";
import { SidebarUserMenu } from "./sidebar-user-menu";
import type { ArenaMembership } from "@/types/auth";
import { NavLinks } from "@/components/layout/nav-links";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { ArenaNotificationBell } from "@/components/layout/arena-notification-bell";
import { AgencyBillingNotice } from "@/components/layout/agency-billing-notice";
import { WorkspaceBreadcrumb } from "@/components/layout/page-breadcrumb";
import { MobileAppFrame } from "@/components/layout/mobile-app-frame";

type AppShellProps = {
  arenaName: string;
  arenaLogoUrl: string;
  activeArenaId: string | null;
  memberships: ArenaMembership[];
  userName: string;
  userRole: string;
  canManageUsers: boolean;
  canManageFinancialSettings: boolean;
  canManageCourtSettings: boolean;
  canManagePrinterSettings: boolean;
  financeView: { receivable: boolean; payable: boolean; reports: boolean };
  canEditStock: boolean;
  visibleModules: string[];
  canAccessAgency: boolean;
  whatsappUnreadCount: number;
  notifications: { id: string; title: string; message: string; href: string; createdAt: Date }[];
  billingAlert: { id: string; daysRemaining: number; deadline: Date; checkoutUrl: string } | null;
  children: React.ReactNode;
};

export function AppShell({
  arenaName,
  arenaLogoUrl,
  activeArenaId,
  memberships,
  userName,
  userRole,
  canManageUsers,
  canManageFinancialSettings,
  canManageCourtSettings,
  canManagePrinterSettings,
  financeView,
  canEditStock,
  visibleModules,
  canAccessAgency,
  whatsappUnreadCount,
  notifications,
  billingAlert,
  children
}: AppShellProps) {
  return (
    <MobileAppFrame arenaName={arenaName} sidebar={<aside id="arena-mobile-navigation" className={viewStyles.sidebar} aria-label="Menu lateral">
        <div className={viewStyles.sidebar_inner}>
          <div className={viewStyles.sidebar_top}>
            <div className={viewStyles.brand_lockup_sidebar_brand_lockup}>
              <div className={viewStyles.brand_logo_wrap}>
                <Image
                  src={arenaLogoUrl || "/arena-profile.jpg"}
                  alt="Logo da Arena Padel"
                  width={48}
                  height={48}
                  className={viewStyles.brand_logo}
                  priority
                />
              </div>
              <div className={viewStyles.sidebar_brand_copy}>
                <p className={viewStyles.eyebrow}>Arena Padel Manager</p>
                <strong>{arenaName}</strong>
              </div>
              <ArenaNotificationBell notifications={notifications} />
            </div>

            <SidebarUserMenu userName={userName} userRole={userRole} />
            <WorkspaceSwitcher
              activeArenaId={activeArenaId}
              memberships={memberships}
              canAccessAgency={canAccessAgency}
              currentWorkspace="arena"
            />

            <NavLinks pollingScope={activeArenaId ?? ""} key={activeArenaId} canManageUsers={canManageUsers} canManageFinancialSettings={canManageFinancialSettings} canManageCourtSettings={canManageCourtSettings} canManagePrinterSettings={canManagePrinterSettings} financeView={financeView} canEditStock={canEditStock} visibleModules={visibleModules} whatsappUnreadCount={whatsappUnreadCount} />
          </div>


        </div>
      </aside>}>
      <main className={viewStyles.app_main}>
        <div className={viewStyles.content_shell}>{billingAlert ? <><AgencyBillingNotice invoiceId={billingAlert.id} daysRemaining={billingAlert.daysRemaining} /><div className={viewStyles.agency_payment_alert} role="alert"><strong>Fatura do sistema em atraso.</strong><span>Regularize o pagamento para evitar a suspensão do acesso{billingAlert.daysRemaining ? ` em ${billingAlert.daysRemaining} dia${billingAlert.daysRemaining === 1 ? "" : "s"}` : " hoje"}.</span>{billingAlert.checkoutUrl ? <a href={billingAlert.checkoutUrl} target="_blank" rel="noopener noreferrer">Pagar fatura</a> : <span>Solicite o link de pagamento à agência.</span>}</div></> : null}<WorkspaceBreadcrumb canViewTournaments={visibleModules.includes("tournaments")} />{children}</div>
      </main>
    </MobileAppFrame>
  );
}
