import { ArenaUserForm } from "@/components/forms/arena-user-form";
import { SectionCard } from "@/components/section-card";
import { UserActionsCell } from "@/components/users/user-actions-cell";
import { prisma } from "@/lib/prisma";
import type { ArenaRole } from "@/types/auth";

type ArenaUsersManagementProps = {
  arenaId: string;
  currentUserId: string;
};

export async function ArenaUsersManagement({ arenaId, currentUserId }: ArenaUsersManagementProps) {
  const members = await prisma.arenaMember.findMany({
    where: { arenaId },
    include: { user: true },
    orderBy: [{ role: "desc" }, { user: { name: "asc" } }]
  });

  return (
    <div className="stack-md">
      <SectionCard title="Novo usuário" description="Crie um acesso novo ou vincule um usuário já existente à arena atual.">
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
                    viewPermissions={member.viewPermissions}
                    editPermissions={member.editPermissions}
                    isCurrentUser={member.userId === currentUserId}
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
