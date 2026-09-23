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
    <div className="app-shell">
      <aside className="sidebar" aria-label="Menu lateral">
        <div className="sidebar-inner">
          <div className="sidebar-top">
            <div className="brand-lockup sidebar-brand-lockup">
              <div className="brand-logo-wrap">
                <Image
                  src={arenaLogoUrl || "/arena-profile.jpg"}
                  alt="Logo da Arena Padel"
                  width={48}
                  height={48}
                  className="brand-logo"
                  priority
                />
              </div>
              <div className="sidebar-brand-copy">
                <p className="eyebrow">Arena Padel Manager</p>
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

            <NavLinks canManageUsers={canManageUsers} visibleModules={visibleModules} whatsappUnreadCount={whatsappUnreadCount} />
          </div>

          <div className="sidebar-user sidebar-user-panel">
            <div className="user-copy">
              <p className="user-name">{userName}</p>
              <p className="muted">{userRole}</p>
            </div>

            {visibleModules.includes("arena") || visibleModules.includes("calendar") ? <nav className="sidebar-settings-menu" aria-label="Configurações"><Link href="/arena" className="sidebar-settings-link">Configurações</Link></nav> : null}
            <form action={logoutAction}>
              <button className="button button-secondary" type="submit">
                Sair
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="app-main">
        <div className="content-shell">{billingAlert ? <><AgencyBillingNotice invoiceId={billingAlert.id} daysRemaining={billingAlert.daysRemaining} /><div className="agency-payment-alert" role="alert"><strong>Fatura do sistema em atraso.</strong><span>Regularize o pagamento para evitar a suspensão do acesso{billingAlert.daysRemaining ? ` em ${billingAlert.daysRemaining} dia${billingAlert.daysRemaining === 1 ? "" : "s"}` : " hoje"}.</span>{billingAlert.checkoutUrl ? <a href={billingAlert.checkoutUrl} target="_blank" rel="noopener noreferrer">Pagar fatura</a> : <span>Solicite o link de pagamento à agência.</span>}</div></> : null}<WorkspaceBreadcrumb />{children}</div>
      </main>
    </div>
  );
}
