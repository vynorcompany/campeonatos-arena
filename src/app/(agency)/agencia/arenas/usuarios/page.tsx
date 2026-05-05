import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { updateUserSystemRoleAction } from "@/lib/actions/agency";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function AgencyArenaUsersPage() {
  const auth = await requireAgencyAccess();
  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          arena: true
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Agência</p>
          <h1>Usuários das arenas</h1>
          <p className="muted">Veja vínculos, papéis por arena e níveis de agência de todos os usuários.</p>
        </div>
      </header>

      <SectionCard title="Usuários" description="Usuários de agência entram no sistema separado; usuários comuns entram no painel da arena.">
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Nível de agência</th>
              <th>Arenas vinculadas</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <span className="table-subtext">{user.email}</span>
                </td>
                <td>
                  <SafeActionForm action={updateUserSystemRoleAction} className="agency-user-role-form" successMessage="Usuário atualizado.">
                    <input type="hidden" name="userId" value={user.id} />
                    <select name="systemRole" defaultValue={user.systemRole}>
                      <option value="SUPER_ADMIN">Super admin</option>
                      <option value="ADMIN">Agência admin</option>
                      <option value="MANAGER">CS/manager</option>
                      <option value="VIEWER">Usuário comum</option>
                    </select>
                    <SubmitButton label={user.id === auth.userId ? "Você" : "Salvar"} pendingLabel="..." className="button" />
                  </SafeActionForm>
                </td>
                <td>
                  {user.memberships.map((membership) => (
                    <span className="pill" key={membership.id}>{membership.arena.name}: {membership.role}</span>
                  ))}
                  {!user.memberships.length ? <span className="muted">Sem arena vinculada</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
