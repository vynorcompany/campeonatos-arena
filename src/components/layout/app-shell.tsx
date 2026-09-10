import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import type { ArenaMembership } from "@/types/auth";
import { NavLinks } from "@/components/layout/nav-links";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { ArenaNotificationBell } from "@/components/layout/arena-notification-bell";

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
  notifications: { id: string; title: string; message: string; href: string; createdAt: Date }[];
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
  notifications,
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
              <div>
                <p className="eyebrow">Arena Padel Manager</p>
                <strong>{arenaName}</strong>
              </div>
            </div>

            <WorkspaceSwitcher
              activeArenaId={activeArenaId}
              memberships={memberships}
              canAccessAgency={canAccessAgency}
              currentWorkspace="arena"
            />

            <ArenaNotificationBell notifications={notifications} />

            <NavLinks canManageUsers={canManageUsers} visibleModules={visibleModules} />
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
        <div className="content-shell">{children}</div>
      </main>
    </div>
  );
}
