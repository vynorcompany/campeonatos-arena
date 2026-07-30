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
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Campeonatos</p>
          <h1>Eventos e categorias</h1>
          <p className="muted">
            Cada evento reúne categorias com formato, duplas, jogos e ranking
            próprios.
          </p>
        </div>
        <div className="section-actions">
          <Link href="/torneios/novo" className="button button-primary">
            Novo evento
          </Link>
          <Link href="/torneios/rankings" className="button">
            Rankings
          </Link>
        </div>
      </header>

      <SectionCard
        title="Eventos em operação"
        description="Abra um evento para seguir a próxima ação de cada categoria."
      >
        {openEvents.length ? (
          <div className="simple-grid simple-grid-2">
            {openEvents.map((event) => {
              const configuredCount = event.categories.filter(
                (category) => category.competition,
              ).length;
              const finishedCount = event.categories.filter(
                (category) => category.competition?.status === "FINISHED",
              ).length;

              return (
                <article className="section-card stack-sm" key={event.id}>
                  <div className="page-header">
                    <div className="stack-xs">
                      <h3>{event.name}</h3>
                      <p className="muted">
                        {event.description || "Sem descrição"}
                      </p>
                    </div>
                    <StatusBadge status={event.registrationPhase} />
                  </div>

                  <dl className="t-review-grid">
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

                  {event.categories.length ? (
                    <div className="field-inline">
                      {event.categories.map((category) => (
                        <span className="pill" key={category.id}>
                          {category.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">Nenhuma categoria adicionada.</p>
                  )}

                  <div className="section-actions">
                    <Link
                      href={`/torneios/${event.id}?tab=categories`}
                      className="button button-primary"
                    >
                      Abrir evento
                    </Link>
                    <SafeActionForm
                      action={deleteTournamentAction}
                      confirmKeyword="EXCLUIR"
                      confirmPrompt="Digite EXCLUIR para remover este evento permanentemente."
                      successMessage="Evento excluído."
                    >
                      <input
                        type="hidden"
                        name="tournamentId"
                        value={event.id}
                      />
                      <SubmitButton
                        label="Excluir"
                        pendingLabel="Excluindo..."
                        className="button button-danger"
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
          <div className="simple-list">
            {finishedEvents.map((event) => (
              <div className="simple-item" key={event.id}>
                <div className="match-copy">
                  <strong>{event.name}</strong>
                  <span>
                    {event.categories.length} categorias · atualizado em{" "}
                    {event.updatedAt.toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <Link
                  href={`/torneios/${event.id}?tab=results`}
                  className="button"
                >
                  Ver resultados
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Nenhum evento finalizado.</p>
        )}
      </SectionCard>
    </div>
  );
}
