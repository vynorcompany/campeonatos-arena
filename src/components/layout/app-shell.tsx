import { viewStyles } from "./app-shell.utilities";
import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import type { ArenaMembership } from "@/types/auth";
import { NavLinks } from "@/components/layout/nav-links";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { ArenaNotificationBell } from "@/components/layout/arena-notification-bell";
import { AgencyBillingNotice } from "@/components/layout/agency-billing-notice";
import { WorkspaceBreadcrumb } from "@/components/layout/page-breadcrumb";

type AppShellProps = {
  arenaName: string;
  arenaLogoUrl: string;
  activeArenaId: string | null;
  memberships: ArenaMembership[];
  userName: string;
  userRole: string;
  canManageUsers: boolean;
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
  visibleModules,
  canAccessAgency,
  whatsappUnreadCount,
  notifications,
  billingAlert,
  children
}: AppShellProps) {
  return (
    <div className={viewStyles.app_shell}>
      <aside className={viewStyles.sidebar} aria-label="Menu lateral">
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

            <WorkspaceSwitcher
              activeArenaId={activeArenaId}
              memberships={memberships}
              canAccessAgency={canAccessAgency}
              currentWorkspace="arena"
            />

            <NavLinks key={activeArenaId} canManageUsers={canManageUsers} visibleModules={visibleModules} whatsappUnreadCount={whatsappUnreadCount} />
          </div>

          <div className={viewStyles.sidebar_user_sidebar_user_panel}>
            <div className={viewStyles.user_copy}>
              <p className={viewStyles.user_name}>{userName}</p>
              <p className={viewStyles.muted}>{userRole}</p>
            </div>

            {visibleModules.includes("arena") || visibleModules.includes("calendar") ? <nav className={viewStyles.sidebar_settings_menu} aria-label="Configurações"><Link href="/arena" className={viewStyles.sidebar_settings_link}>Configurações</Link></nav> : null}
            <form action={logoutAction}>
              <button className={viewStyles.button_button_secondary} type="submit">
                Sair
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className={viewStyles.app_main}>
        <div className={viewStyles.content_shell}>{billingAlert ? <><AgencyBillingNotice invoiceId={billingAlert.id} daysRemaining={billingAlert.daysRemaining} /><div className={viewStyles.agency_payment_alert} role="alert"><strong>Fatura do sistema em atraso.</strong><span>Regularize o pagamento para evitar a suspensão do acesso{billingAlert.daysRemaining ? ` em ${billingAlert.daysRemaining} dia${billingAlert.daysRemaining === 1 ? "" : "s"}` : " hoje"}.</span>{billingAlert.checkoutUrl ? <a href={billingAlert.checkoutUrl} target="_blank" rel="noopener noreferrer">Pagar fatura</a> : <span>Solicite o link de pagamento à agência.</span>}</div></> : null}<WorkspaceBreadcrumb />{children}</div>
      </main>
    </div>
  );
}
