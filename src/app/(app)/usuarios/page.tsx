import { viewStyles } from "./page.utilities";
import { ArenaUsersManagement } from "@/components/users/arena-users-management";
import { requireRole } from "@/lib/auth/guards";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const auth = await requireRole("ADMIN");
  const { q } = await searchParams;
  return (
    <div className={viewStyles.stack_md}>
      <h1 className="tw:sr-only">Usuários</h1>

      <ArenaUsersManagement arenaId={auth.arenaId} currentUserId={auth.userId} query={q?.trim().slice(0, 100) ?? ""} />
    </div>
  );
}
