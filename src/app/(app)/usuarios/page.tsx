import { ArenaUsersManagement } from "@/components/users/arena-users-management";
import { requireRole } from "@/lib/auth/guards";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const auth = await requireRole("ADMIN");
  const { q } = await searchParams;
  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Acesso</p>
          <h1>Usuários</h1>
          <p className="muted">
            Convide pessoas para esta arena, acompanhe acessos e gerencie os perfis de cada usuário.
          </p>
        </div>
      </header>

      <ArenaUsersManagement arenaId={auth.arenaId} currentUserId={auth.userId} query={q?.trim().slice(0, 100) ?? ""} />
    </div>
  );
}
