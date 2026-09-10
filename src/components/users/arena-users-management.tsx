import { ArenaUserForm } from "@/components/forms/arena-user-form";
import { SectionCard } from "@/components/section-card";
import { UserActionsCell } from "@/components/users/user-actions-cell";
import { ensureArenaPermissionProfiles } from "@/lib/actions/permission-profile";
import { prisma } from "@/lib/prisma";
import type { ArenaRole } from "@/types/auth";

type ArenaUsersManagementProps = {
  arenaId: string;
  currentUserId: string;
};

export async function ArenaUsersManagement({ arenaId, currentUserId }: ArenaUsersManagementProps) {
  await ensureArenaPermissionProfiles(arenaId);
  const members = await prisma.arenaMember.findMany({
    where: { arenaId },
    include: { user: true, permissionProfile: true },
    orderBy: [{ role: "desc" }, { user: { name: "asc" } }]
  });
  const profiles = await prisma.permissionProfile.findMany({ where: { arenaId, active: true }, orderBy: { name: "asc" } });

  return (
    <div className="stack-md">
      <SectionCard title="Novo usuário" description="Crie um acesso novo ou vincule um usuário já existente à arena atual.">
        <ArenaUserForm profiles={profiles.map((profile) => ({ id: profile.id, name: profile.name }))} />
      </SectionCard>

      <SectionCard
        title="Usuários da arena"
        description="Edite dados, papéis, senha temporária ou remova o acesso de quem não deve mais usar esta arena."
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Perfil</th>
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
                <td>{member.permissionProfile?.name ?? "Acesso legado"}</td>
                <td>
                  <UserActionsCell
                    userId={member.userId}
                    name={member.user.name}
                    email={member.user.email}
                    role={member.role as ArenaRole}
                    viewPermissions={member.viewPermissions}
                    editPermissions={member.editPermissions}
                    profileId={member.permissionProfileId}
                    profiles={profiles.map((profile) => ({ id: profile.id, name: profile.name }))}
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
