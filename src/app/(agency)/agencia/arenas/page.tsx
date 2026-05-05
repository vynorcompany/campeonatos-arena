import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { deleteAgencyArenaAction, updateAgencyArenaAction, updateAgencyArenaStatusAction } from "@/lib/actions/agency";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function AgencyArenasPage() {
  await requireAgencyAccess();
  const arenas = await prisma.arena.findMany({
    include: {
      _count: {
        select: {
          members: true,
          players: true,
          students: true,
          supportTickets: true
        }
      }
    },
    orderBy: [{ accountStatus: "asc" }, { name: "asc" }]
  });

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Agência</p>
          <h1>Arenas</h1>
          <p className="muted">Controle as contas cadastradas, edite dados, pause ou remova uma operação.</p>
        </div>
      </header>

      <SectionCard title="Todas as arenas" description="Gerenciamento operacional das contas multi-tenant.">
        <div className="agency-arena-management-list">
          {arenas.map((arena) => (
            <article key={arena.id} className="agency-arena-card">
              <div className="agency-ticket-head">
                <div>
                  <span className={`ticket-status ticket-status-${arena.accountStatus.toLowerCase()}`}>{arena.accountStatus}</span>
                  <h3>{arena.name}</h3>
                  <p className="muted">{arena.slug} · {arena._count.members} usuário(s) · {arena._count.supportTickets} ticket(s)</p>
                </div>
                <SafeActionForm action={updateAgencyArenaStatusAction} className="agency-status-form" successMessage="Status atualizado.">
                  <input type="hidden" name="arenaId" value={arena.id} />
                  <select name="accountStatus" defaultValue={arena.accountStatus} aria-label={`Status de ${arena.name}`}>
                    <option value="ACTIVE">Ativa</option>
                    <option value="PAUSED">Pausada</option>
                    <option value="CANCELED">Cancelada</option>
                  </select>
                  <SubmitButton label="Salvar status" pendingLabel="..." className="button" />
                </SafeActionForm>
              </div>

              <SafeActionForm action={updateAgencyArenaAction} className="agency-arena-edit-form" successMessage="Arena atualizada.">
                <input type="hidden" name="arenaId" value={arena.id} />
                <input name="name" defaultValue={arena.name} aria-label="Nome da arena" />
                <input name="legalName" defaultValue={arena.legalName} placeholder="Razão social" aria-label="Razão social" />
                <input name="cnpj" defaultValue={arena.cnpj} placeholder="CNPJ" aria-label="CNPJ" />
                <input name="email" defaultValue={arena.email} placeholder="E-mail" aria-label="E-mail" />
                <input name="phone" defaultValue={arena.phone} placeholder="Telefone" aria-label="Telefone" />
                <input name="city" defaultValue={arena.city} placeholder="Cidade" aria-label="Cidade" />
                <input name="state" defaultValue={arena.state} placeholder="Estado" aria-label="Estado" />
                <textarea name="agencyNotes" defaultValue={arena.agencyNotes} placeholder="Notas internas da agência" aria-label="Notas internas" />
                <SubmitButton label="Salvar arena" pendingLabel="Salvando..." className="button button-primary" />
              </SafeActionForm>

              <SafeActionForm action={deleteAgencyArenaAction} className="agency-danger-form" successMessage="Arena removida.">
                <input type="hidden" name="arenaId" value={arena.id} />
                <button
                  type="submit"
                  className="button button-secondary"
                >
                  Excluir arena
                </button>
              </SafeActionForm>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
