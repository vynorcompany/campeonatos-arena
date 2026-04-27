import Image from "next/image";
import { logoutAction } from "@/lib/auth/actions";
import { NavLinks } from "@/components/layout/nav-links";

type AppShellProps = {
  arenaName: string;
  userName: string;
  userRole: string;
  children: React.ReactNode;
};

export function AppShell({ arenaName, userName, userRole, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-lockup">
            <div className="brand-logo-wrap">
              <Image
                src="/arena-profile.jpg"
                alt="Logo da Arena Padel"
                width={48}
                height={48}
                className="brand-logo"
                priority
              />
            </div>
            <div>
              <p className="eyebrow">Arena Padel</p>
              <strong>{arenaName}</strong>
            </div>
          </div>

          <NavLinks />

          <div className="topbar-user">
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
      </header>

      <main className="app-main">
        <div className="content-shell">{children}</div>
      </main>
    </div>
  );
}
