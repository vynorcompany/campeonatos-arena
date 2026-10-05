import { viewStyles } from "./agency-shell.utilities";
import { SidebarUserMenu } from "./sidebar-user-menu";
import { AgencyNavLinks } from "@/components/layout/agency-nav-links";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { AgencyBreadcrumb } from "@/components/layout/page-breadcrumb";
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
    <div className={viewStyles.agency_shell}>
      <aside className={viewStyles.agency_sidebar} aria-label="Menu da agência">
        <div className={viewStyles.sidebar_inner}>
          <div className={viewStyles.sidebar_top}>
            <div className={viewStyles.agency_brand}>
              <span>APM</span>
              <div>
                <p className={viewStyles.eyebrow}>Arena Padel Manager</p>
                <strong>Agência</strong>
              </div>
            </div>

            <SidebarUserMenu userName={userName} userRole={userRole} accountHref={null} />
            <WorkspaceSwitcher
              activeArenaId={activeArenaId}
              memberships={memberships}
              canAccessAgency
              currentWorkspace="agency"
            />

            <AgencyNavLinks />
          </div>

        </div>
      </aside>
      <main className={viewStyles.agency_main}>
        <div className={viewStyles.agency_content}><AgencyBreadcrumb />{children}</div>
      </main>
    </div>
  );
}
