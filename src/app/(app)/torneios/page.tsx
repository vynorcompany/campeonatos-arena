import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/tournaments/empty-state";
import { StatusBadge } from "@/components/tournaments/status-badge";
import { deleteTournamentAction } from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function TournamentsPage() {
  const auth = await requireModuleView("tournaments");
  const events = await prisma.tournament.findMany({
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
      <header className={viewStyles.page_header}>
        <div className={viewStyles.stack_xs}>
          <p className={viewStyles.eyebrow}>Campeonatos</p>
          <h1>Eventos e categorias</h1>
          <p className={viewStyles.muted}>
            Cada evento reúne categorias com formato, duplas, jogos e ranking
            próprios.
          </p>
        </div>
        <div className={viewStyles.section_actions}>
          <Link href="/torneios/novo" className={viewStyles.button_button_primary}>
            Novo evento
          </Link>
          <Link href="/torneios/rankings" className={viewStyles.button}>
            Rankings
          </Link>
        </div>
      </header>

      <SectionCard
        title="Eventos em operação"
        description="Abra um evento para seguir a próxima ação de cada categoria."
      >
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
                        {event.categories.map((category) => (
                          <span className={viewStyles.t_event_category} key={category.id}>
                            {category.name}
                          </span>
                        ))}
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
      </SectionCard>

      <SectionCard
        title="Histórico"
        description="Eventos marcados como finalizados."
      >
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
          <p className={viewStyles.muted}>Nenhum evento finalizado.</p>
        )}
      </SectionCard>
    </div>
  );
}
