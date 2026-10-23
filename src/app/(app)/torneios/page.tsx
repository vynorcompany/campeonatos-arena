import { WorkspaceHeading } from "@/components/ui/workspace-heading";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { EmptyState } from "@/components/tournaments/empty-state";
import { StatusBadge } from "@/components/tournaments/status-badge";
import { deleteTournamentAction } from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";
import { arenaDatabase } from "@/lib/arena-database";

export default async function TournamentsPage() {
  const auth = await requireModuleView("tournaments");
  if (!canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) redirect("/jogos");
  const events = await arenaDatabase(auth.arenaId).tournament.findMany({
    where: { arenaId: auth.arenaId },
    orderBy: { updatedAt: "desc" },
    include: {
      categories: {
        where: { active: true },
        orderBy: { level: "asc" },
        select: {
          id: true,
          name: true,
          competition: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
      _count: {
        select: {
          publicRegistrations: true,
        },
      },
    },
  });

  const openEvents = events.filter(
    (event) => event.registrationPhase !== "FINISHED",
  );
  const finishedEvents = events.filter(
    (event) => event.registrationPhase === "FINISHED",
  );

  return (
    <div className={viewStyles.stack_md}>
      <nav className={viewStyles.page_breadcrumb} aria-label="Caminho de navegação"><span>Arena</span><i aria-hidden="true">›</i><strong>Torneios</strong></nav>
      <WorkspaceHeading eyebrow="COMPETIÇÕES · GESTÃO" title="Torneios da arena" description="Da primeira inscrição ao último resultado. Todos os seus eventos em um só lugar.">
        <Link href="/torneios/rankings" className={viewStyles.button}>Rankings</Link>
        <Link href="/torneios/novo" className={viewStyles.button_button_primary}>Novo evento</Link>
      </WorkspaceHeading>
      <div className="tw:grid tw:grid-cols-3 tw:gap-3 tw:viewport-620:grid-cols-1">{[{ label: "Em operação", value: openEvents.length }, { label: "Finalizados", value: finishedEvents.length }, { label: "Inscrições recebidas", value: events.reduce((total, event) => total + event._count.publicRegistrations, 0) }].map((metric) => <div key={metric.label} className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:rounded-xl tw:border tw:border-[#dce7f2] tw:bg-white tw:px-5 tw:py-4"><span className="tw:text-xs tw:font-medium tw:text-[#607898]">{metric.label}</span><strong className="tw:text-2xl tw:font-semibold tw:tabular-nums tw:text-[#132d58]">{metric.value}</strong></div>)}</div>

      <section className={viewStyles.event_section} aria-label="Eventos em operação">
        <h2>Eventos em operação <span>{openEvents.length}</span></h2>
        {openEvents.length ? (
          <div className={viewStyles.t_event_list}>
            {openEvents.map((event) => {
              const configuredCount = event.categories.filter(
                (category) => category.competition,
              ).length;
              const finishedCount = event.categories.filter(
                (category) => category.competition?.status === "FINISHED",
              ).length;

              return (
                <article className={viewStyles.t_event_row} key={event.id}>
                  <div className={viewStyles.t_event_identity}>
                    <div>
                      <h3>{event.name}</h3>
                      <p>
                        {event.description || "Sem descrição"}
                      </p>
                    </div>
                    {event.categories.length ? (
                      <div className={viewStyles.t_event_categories}>
                        {event.categories.slice(0, 3).map((category) => (
                          <span className={viewStyles.t_event_category} key={category.id}>
                            {category.name}
                          </span>
                        ))}
                        {event.categories.length > 3 ? <span className={viewStyles.t_event_category}>+{event.categories.length - 3} categorias</span> : null}
                      </div>
                    ) : (
                      <p className={viewStyles.t_event_category}>Nenhuma categoria adicionada.</p>
                    )}
                  </div>

                  <div className={viewStyles.t_event_metadata}>
                    <StatusBadge status={event.registrationPhase} />
                    <dl>
                      <div>
                        <dt>Categorias</dt>
                        <dd>
                          {configuredCount}/{event.categories.length} configuradas
                        </dd>
                      </div>
                      <div>
                        <dt>Concluídas</dt>
                        <dd>
                          {finishedCount}/{event.categories.length}
                        </dd>
                      </div>
                      <div>
                        <dt>Inscrições recebidas</dt>
                        <dd>{event._count.publicRegistrations}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className={viewStyles.t_event_action}>
                    <Link
                      href={`/torneios/${event.id}?tab=categories`}
                      className={viewStyles.button_button_primary}
                    >
                      Abrir
                    </Link>
                    <SafeActionForm
                      action={deleteTournamentAction}
                      confirmKeyword="EXCLUIR"
                      confirmPrompt="Digite EXCLUIR para remover este evento permanentemente."
                      successMessage="Evento excluído."
                      successHref="/painel"
                    >
                      <input
                        type="hidden"
                        name="tournamentId"
                        value={event.id}
                      />
                      <SubmitButton
                        label="Excluir"
                        pendingLabel="Excluindo..."
                        className={viewStyles.button_button_danger}
                      />
                    </SafeActionForm>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Nenhum evento em operação"
            description="Crie um evento e adicione as categorias depois."
            ctaLabel="Criar evento"
            ctaHref="/torneios/novo"
          />
        )}
      </section>

      <section className={viewStyles.event_section} aria-label="Histórico de torneios">
        <h2>Histórico <span>{finishedEvents.length}</span></h2>
        {finishedEvents.length ? (
          <div className={viewStyles.t_event_list_2}>
            {finishedEvents.map((event) => (
              <article className={viewStyles.t_event_row_t_event_row_history} key={event.id}>
                <div className={viewStyles.t_event_identity}>
                  <strong>{event.name}</strong>
                  <span className={viewStyles.t_event_category}>
                    {event.categories.length} categorias
                  </span>
                </div>
                <div className={viewStyles.t_event_metadata}>
                  <span>Atualizado em {event.updatedAt.toLocaleDateString("pt-BR")}</span>
                </div>
                <div className={viewStyles.t_event_action}>
                  <Link
                    href={`/torneios/${event.id}?tab=results`}
                    className={viewStyles.button}
                  >
                    Ver resultados
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className={viewStyles.empty_history}>Nenhum evento finalizado.</p>
        )}
      </section>
    </div>
  );
}
