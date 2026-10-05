import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./page.utilities";
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
    <div className={viewStyles.stack_md}>
      <header className={viewStyles.page_header}>
        <div className={viewStyles.stack_xs}>
          <p className={viewStyles.eyebrow}>Agência</p>
          <h1>Arenas</h1>
          <p className={viewStyles.muted}>Controle as contas cadastradas, edite dados, pause ou remova uma operação.</p>
        </div>
      </header>

      <SectionCard title="Todas as arenas" description="Gerenciamento operacional das contas multi-tenant.">
        <div className={viewStyles.agency_arena_management_list}>
          {arenas.map((arena) => (
            <article key={arena.id} className={viewStyles.agency_arena_card}>
              <div className={viewStyles.agency_ticket_head}>
                <div>
                  <span className={cx(`${viewStyles.ticket_status} ticket-status-${arena.accountStatus.toLowerCase()}`)}>{arena.accountStatus}</span>
                  <h3>{arena.name}</h3>
                  <p className={viewStyles.muted}>{arena.slug} · {arena._count.members} usuário(s) · {arena._count.supportTickets} ticket(s)</p>
                </div>
                <SafeActionForm action={updateAgencyArenaStatusAction} className={viewStyles.agency_status_form} successMessage="Status atualizado.">
                  <input type="hidden" name="arenaId" value={arena.id} />
                  <select name="accountStatus" defaultValue={arena.accountStatus} aria-label={`Status de ${arena.name}`}>
                    <option value="ACTIVE">Ativa</option>
                    <option value="PAUSED">Pausada</option>
                    <option value="CANCELED">Cancelada</option>
                  </select>
                  <SubmitButton label="Salvar status" pendingLabel="..." className={viewStyles.button} />
                </SafeActionForm>
              </div>

              <SafeActionForm action={updateAgencyArenaAction} className={viewStyles.agency_arena_edit_form} successMessage="Arena atualizada.">
                <input type="hidden" name="arenaId" value={arena.id} />
                <input name="name" defaultValue={arena.name} aria-label="Nome da arena" />
                <input name="legalName" defaultValue={arena.legalName} placeholder="Razão social" aria-label="Razão social" />
                <input name="cnpj" defaultValue={arena.cnpj} placeholder="CNPJ" aria-label="CNPJ" />
                <input name="email" defaultValue={arena.email} placeholder="E-mail" aria-label="E-mail" />
                <input name="phone" defaultValue={arena.phone} placeholder="Telefone" aria-label="Telefone" />
                <input name="city" defaultValue={arena.city} placeholder="Cidade" aria-label="Cidade" />
                <input name="state" defaultValue={arena.state} placeholder="Estado" aria-label="Estado" />
                <textarea name="agencyNotes" defaultValue={arena.agencyNotes} placeholder="Notas internas da agência" aria-label="Notas internas" />
                <SubmitButton label="Salvar arena" pendingLabel="Salvando..." className={viewStyles.button_button_primary} />
              </SafeActionForm>

              <SafeActionForm action={deleteAgencyArenaAction} className={viewStyles.agency_danger_form} successMessage="Arena removida.">
                <input type="hidden" name="arenaId" value={arena.id} />
                <button
                  type="submit"
                  className={viewStyles.button_button_secondary}
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
