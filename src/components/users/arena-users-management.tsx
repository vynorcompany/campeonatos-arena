import { ArenaUserForm } from "@/components/forms/arena-user-form";
import { SectionCard } from "@/components/section-card";
import { UserActionsCell } from "@/components/users/user-actions-cell";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { revokeArenaInviteAction } from "@/lib/actions/account-access";
import { ensureArenaPermissionProfiles } from "@/lib/actions/permission-profile";
import { prisma } from "@/lib/prisma";
import type { ArenaRole } from "@/types/auth";

type ArenaUsersManagementProps = {
  arenaId: string;
  currentUserId: string;
  query?: string;
};

export async function ArenaUsersManagement({ arenaId, currentUserId, query = "" }: ArenaUsersManagementProps) {
  await ensureArenaPermissionProfiles(arenaId);
  const members = await prisma.arenaMember.findMany({
    where: { arenaId, ...(query ? { user: { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] } } : {}) },
    include: { user: true, permissionProfile: true },
    orderBy: [{ role: "desc" }, { user: { name: "asc" } }]
  });
  const [profiles, invites] = await Promise.all([
    prisma.permissionProfile.findMany({ where: { arenaId, active: true }, orderBy: { name: "asc" } }),
    prisma.accountActionToken.findMany({ where: { arenaId, kind: "INVITE", usedAt: null, expiresAt: { gt: new Date() }, ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] } : {}) }, select: { id: true, email: true, name: true, expiresAt: true }, orderBy: { createdAt: "desc" }, take: 50 })
  ]);

  return (
    <div className="stack-md">
      <SectionCard title="Usuários" description="Cada acesso pertence a esta arena. Novos usuários definem a própria senha por um convite enviado ao e-mail.">
        <details className="setting-create-panel">
          <summary className="button button-primary button-small">Convidar usuário</summary>
          <div><ArenaUserForm profiles={profiles.map((profile) => ({ id: profile.id, name: profile.name }))} /></div>
        </details>
        <form method="GET" action="/usuarios" className="user-search-form" role="search"><label htmlFor="user-search">Buscar por nome ou e-mail</label><div><input id="user-search" name="q" type="search" defaultValue={query} placeholder="Nome ou e-mail" /><button className="button button-small" type="submit">Buscar</button>{query ? <a className="button button-small" href="/usuarios">Limpar</a> : null}</div></form>
        <p className="muted">{members.length} {members.length === 1 ? "usuário encontrado" : "usuários encontrados"}</p>
        <div className="user-table-scroll"><table className="data-table">
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
        </table></div>
        {!members.length ? <p className="muted">Nenhum usuário corresponde à busca nesta arena.</p> : null}
      </SectionCard>
      {invites.length ? <SectionCard title="Convites pendentes" description="O link de convite expira em 48 horas."><div className="user-invites-list">{invites.map((invite) => <article key={invite.id} className="user-invite-row"><div><strong>{invite.name}</strong><span>{invite.email}</span></div><span>Válido até {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(invite.expiresAt)}</span><SafeActionForm action={revokeArenaInviteAction} successMessage="Convite revogado."><input type="hidden" name="inviteId" value={invite.id} /><button type="submit" className="button button-small">Revogar</button></SafeActionForm></article>)}</div></SectionCard> : null}
    </div>
  );
}
