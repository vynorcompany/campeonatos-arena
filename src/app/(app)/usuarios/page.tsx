import { ArenaUserForm } from "@/components/forms/arena-user-form";
import { SectionCard } from "@/components/section-card";
import { UserActionsCell } from "@/components/users/user-actions-cell";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import type { ArenaRole } from "@/types/auth";

export default async function UsersPage() {
  const auth = await requireRole("ADMIN");
  const members = await prisma.arenaMember.findMany({
    where: {
      arenaId: auth.arenaId
    },
    include: {
      user: true
    },
    orderBy: [
      { role: "desc" },
      { user: { name: "asc" } }
    ]
  });

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

      <SectionCard
        title="Novo usuário"
        description="Crie um acesso novo ou vincule um usuário já existente à arena atual."
      >
        <ArenaUserForm />
      </SectionCard>

      <SectionCard
        title="Usuários da arena"
        description="Edite dados, papéis, senha temporária ou remova o acesso de quem não deve mais usar esta arena."
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>
                  <strong>{member.user.name}</strong>
                  <span className="table-subtext">{member.user.email}</span>
                </td>
                <td>
                  <UserActionsCell
                    userId={member.userId}
                    name={member.user.name}
                    email={member.user.email}
                    role={member.role as ArenaRole}
                    isCurrentUser={member.userId === auth.userId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
