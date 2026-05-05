import { AgencyShell } from "@/components/layout/agency-shell";
import { requireAgencyAccess } from "@/lib/auth/guards";

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAgencyAccess();

  return (
    <AgencyShell
      userName={auth.userName}
      userRole={auth.systemRole}
      activeArenaId={auth.arenaId}
      memberships={auth.memberships}
    >
      {children}
    </AgencyShell>
  );
}
