import { AppShell } from "@/components/layout/app-shell";
import { requireArenaAccess } from "@/lib/auth/session";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireArenaAccess();

  return (
    <AppShell
      arenaName={auth.arenaName ?? "Arena"}
      userName={auth.userName}
      userRole={auth.arenaRole ?? auth.systemRole}
    >
      {children}
    </AppShell>
  );
}
