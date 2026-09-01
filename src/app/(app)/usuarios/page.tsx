import { ArenaUsersManagement } from "@/components/users/arena-users-management";
import { requireRole } from "@/lib/auth/guards";

export default async function UsersPage() {
  const auth = await requireRole("ADMIN");
  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Acesso</p>
          <h1>Usuários</h1>
          <p className="muted">
            Gerencie quem pode acessar a arena, ajuste papéis e redefina senhas sem depender de credenciais de teste.
          </p>
        </div>
      </header>

      <ArenaUsersManagement arenaId={auth.arenaId} currentUserId={auth.userId} />
    </div>
  );
}
