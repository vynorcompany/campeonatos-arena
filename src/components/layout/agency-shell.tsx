import { logoutAction } from "@/lib/auth/actions";
import { AgencyNavLinks } from "@/components/layout/agency-nav-links";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import type { ArenaMembership } from "@/types/auth";

type AgencyShellProps = {
  userName: string;
  userRole: string;
  activeArenaId: string | null;
  memberships: ArenaMembership[];
  children: React.ReactNode;
};

export function AgencyShell({ userName, userRole, activeArenaId, memberships, children }: AgencyShellProps) {
  return (
    <div className="agency-shell">
      <aside className="agency-sidebar" aria-label="Menu da agência">
        <div className="sidebar-inner">
          <div className="sidebar-top">
            <div className="agency-brand">
              <span>APM</span>
              <div>
                <p className="eyebrow">Arena Padel Manager</p>
                <strong>Agência</strong>
              </div>
            </div>

            <WorkspaceSwitcher
              activeArenaId={activeArenaId}
              memberships={memberships}
              canAccessAgency
              currentWorkspace="agency"
            />

            <AgencyNavLinks />
          </div>

          <div className="sidebar-user">
            <div className="user-copy">
              <p className="user-name">{userName}</p>
              <p className="muted">{userRole}</p>
            </div>
            <form action={logoutAction}>
              <button className="button button-secondary" type="submit">
                Sair
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="agency-main">
        <div className="agency-content">{children}</div>
      </main>
    </div>
  );
}
