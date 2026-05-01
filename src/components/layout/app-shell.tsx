import Image from "next/image";
import { logoutAction, setActiveArenaAction } from "@/lib/auth/actions";
import type { ArenaMembership } from "@/types/auth";
import { NavLinks } from "@/components/layout/nav-links";

type AppShellProps = {
  arenaName: string;
  arenaLogoUrl: string;
  activeArenaId: string | null;
  memberships: ArenaMembership[];
  userName: string;
  userRole: string;
  canManageUsers: boolean;
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
  children
}: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Menu lateral">
        <div className="sidebar-inner">
          <div className="sidebar-top">
            <div className="brand-lockup">
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

            <NavLinks canManageUsers={canManageUsers} />
          </div>

          <div className="sidebar-user">
            {memberships.length > 1 ? (
              <form action={setActiveArenaAction} className="sidebar-arena-form">
                <label className="sr-only" htmlFor="arenaId">
                  Arena ativa
                </label>
                <select id="arenaId" name="arenaId" defaultValue={activeArenaId ?? memberships[0]?.arenaId} className="sidebar-arena-select">
                  {memberships.map((membership) => (
                    <option key={membership.arenaId} value={membership.arenaId}>
                      {membership.arenaName}
                    </option>
                  ))}
                </select>
                <button className="button" type="submit">
                  Trocar arena
                </button>
              </form>
            ) : null}

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

      <main className="app-main">
        <div className="content-shell">{children}</div>
      </main>
    </div>
  );
}
