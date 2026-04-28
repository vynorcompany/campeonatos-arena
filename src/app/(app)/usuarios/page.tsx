import { SubmitButton } from "@/components/forms/submit-button";
import { ArenaUserForm } from "@/components/forms/arena-user-form";
import { SectionCard } from "@/components/section-card";
import { updateArenaUserRoleAction, resetArenaUserPasswordAction } from "@/lib/actions/user";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const roleLabels: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  STAFF: "Staff",
  VIEWER: "Viewer"
};

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
        description="Acompanhe os acessos ativos e ajuste os papéis de cada pessoa."
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Atualizar papel</th>
              <th>Redefinir senha</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.user.name}</td>
                <td>{member.user.email}</td>
                <td>
                  <span className="pill">{roleLabels[member.role] ?? member.role}</span>
                </td>
                <td>
                  <form action={updateArenaUserRoleAction} className="inline-form">
                    <input type="hidden" name="userId" value={member.userId} />
                    <select name="arenaRole" defaultValue={member.role}>
                      <option value="OWNER">Owner</option>
                      <option value="ADMIN">Admin</option>
                      <option value="STAFF">Staff</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <SubmitButton label="Salvar" pendingLabel="..." className="button" />
                  </form>
                </td>
                <td>
                  <form action={resetArenaUserPasswordAction} className="inline-form">
                    <input type="hidden" name="userId" value={member.userId} />
                    <input name="password" type="password" minLength={10} placeholder="Nova senha temporária" required />
                    <SubmitButton label="Redefinir" pendingLabel="..." className="button" />
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
