import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { CategoryList } from "@/components/tournaments/category-list";
import { EventIcon } from "@/components/tournaments/event-icon";
import { EventQuickActions } from "@/components/tournaments/event-quick-actions";
import { PublicRegistrationLinkActions } from "@/components/tournaments/public-registration-link-actions";
import { deleteTournamentAction, updateTournamentRegistrationPhaseAction } from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type TournamentDetailPageProps = {
  params: Promise<{ tournamentId: string }>;
  searchParams?: Promise<{ action?: string }>;
};

export default async function TournamentDetailPage(props: TournamentDetailPageProps) {
  const params = await props.params;
  const auth = await requireModuleView("tournaments");
  const [tournament] = await Promise.all([
    prisma.tournament.findFirst({
      where: {
        id: params.tournamentId,
        arenaId: auth.arenaId,
      },
      include: {
        arena: {
          select: { slug: true },
        },
        categories: {
          orderBy: { level: "asc" },
          include: {
            competition: {
              select: {
                format: true,
                status: true,
                _count: {
                  select: { pairs: true },
                },
              },
            },
          },
        },
        publicRegistrations: {
          where: { status: "CONFIRMED", paymentStatus: "PAID" },
          orderBy: { createdAt: "asc" },
          select: { id: true, leadName: true, partnerName: true, createdAt: true },
        },
      },
    }),
    prisma.rankingProfile.findMany({
      where: {
        arenaId: auth.arenaId,
        active: true,
        type: "INDIVIDUAL",
        model: "KNOCKOUT",
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!tournament) {
    notFound();
  }

  const finishedCategoryCount = tournament.categories.filter(
    (category) => category.competition?.status === "FINISHED",
  ).length;
  const pairCount = tournament.categories.reduce(
    (total, category) => total + (category.competition?._count.pairs ?? 0),
    0,
  );
  const createdAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(tournament.createdAt);
  const eventState = tournament.registrationPhase === "REGISTRATIONS"
    ? "Inscrições abertas"
    : tournament.registrationPhase === "LIVE"
      ? "Em andamento"
      : tournament.registrationPhase === "FINISHED"
        ? "Finalizado"
        : "Em configuração";

  return (
    <div className={viewStyles.event_dashboard}>
      <header className={viewStyles.event_operation_header}>
        <div className={viewStyles.event_operation_title}>
          <p className={viewStyles.eyebrow}>Evento</p>
          <h1>{tournament.name}</h1>
          <p className={viewStyles.event_breadcrumb}><Link href="/torneios">Eventos</Link><EventIcon name="chevron" size={13} />{tournament.name}</p>
        </div>
        <div className={viewStyles.event_operation_actions}>
          <span className={viewStyles.event_editing_badge}>{eventState} <EventIcon name="edit" size={14} /></span>
          <PublicRegistrationLinkActions slug={tournament.publicSlug} />
          <Link
            href={`/classificacao/${tournament.arena.slug}`}
            className={viewStyles.button}
            target="_blank"
            rel="noreferrer"
          >
            <EventIcon name="external" />Ver página pública
          </Link>
          <Link href="/torneios" className={viewStyles.button}>
             <EventIcon name="arrow-left" />Voltar aos eventos
           </Link>
          <SafeActionForm
            action={deleteTournamentAction}
            className={viewStyles.tournament_delete_action}
            confirmKeyword="EXCLUIR"
            confirmPrompt="Digite EXCLUIR para remover este evento permanentemente."
            successMessage="Evento excluído."
            successHref="/painel"
          >
            <input type="hidden" name="tournamentId" value={tournament.id} />
            <SubmitButton
              label="Excluir evento"
              pendingLabel="Excluindo..."
              className={viewStyles.button_button_danger}
            />
          </SafeActionForm>
        </div>
      </header>

      <section className={viewStyles.event_metrics_grid} aria-label="Resumo do evento">
        <article className={viewStyles.event_metric_card}><span className={viewStyles.event_metric_icon}><EventIcon name="edit" size={24} /></span><div><small>Status do evento</small><strong>{eventState}</strong><p>O evento está visível apenas para administradores.</p></div></article>
        <article className={viewStyles.event_metric_card}><span className={viewStyles.event_metric_icon}><EventIcon name="trophy" size={24} /></span><div><small>Categorias</small><strong>{tournament.categories.length}</strong><p>Categorias configuradas</p></div></article>
        <article className={viewStyles.event_metric_card}><span className={viewStyles.event_metric_icon_event_metric_icon_success}><EventIcon name="users" size={24} /></span><div><small>Inscrições / duplas</small><strong>{pairCount}</strong><p>Duplas inscritas</p></div></article>
        <article className={viewStyles.event_metric_card}><span className={viewStyles.event_metric_icon_event_metric_icon_purple}><EventIcon name="calendar" size={24} /></span><div><small>Criado em</small><strong>{createdAt}</strong><p>Informação do evento</p></div></article>
      </section>

      <div className={viewStyles.event_detail_grid}>
        <div className={viewStyles.event_main_column}>
          <CategoryList
            tournamentId={tournament.id}
            categories={tournament.categories.map((category) => ({
              id: category.id,
              name: category.name,
              competition: category.competition
                ? { format: category.competition.format, pairCount: category.competition._count.pairs }
                : null,
            }))}
          />
          {tournament.firstBonusLimit > 0 ? <section className={viewStyles.section_card}><header><div><p className={viewStyles.eyebrow}>Bônus</p><h2>Primeiros {tournament.firstBonusLimit} pagamentos confirmados</h2><p className={viewStyles.muted}>{tournament.firstBonusUntil ? `Válido até ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(tournament.firstBonusUntil)}.` : "Sem data limite configurada."}</p></div></header>{tournament.publicRegistrations.filter((item) => !tournament.firstBonusUntil || item.createdAt <= tournament.firstBonusUntil).slice(0, tournament.firstBonusLimit).length ? <ol>{tournament.publicRegistrations.filter((item) => !tournament.firstBonusUntil || item.createdAt <= tournament.firstBonusUntil).slice(0, tournament.firstBonusLimit).map((item) => <li key={item.id}>{item.leadName} / {item.partnerName}</li>)}</ol> : <p className={viewStyles.muted}>A lista será preenchida automaticamente conforme os pagamentos forem confirmados.</p>}</section> : null}
        </div>
        <aside className={viewStyles.event_side_column}>
          <EventQuickActions
            tournament={tournament}
            publicPageUrl={`/inscricao/${tournament.publicSlug}`}
            categories={tournament.categories.map((category) => ({ id: category.id, name: category.name, pairCount: category.competition?._count.pairs ?? 0 }))}
          />
          <section className={viewStyles.event_information}>
            <header><EventIcon name="info" /><h2>Informações do evento</h2></header>
            <SafeActionForm action={updateTournamentRegistrationPhaseAction} className={viewStyles.tournament_status_form} successMessage="Status do torneio atualizado.">
              <input type="hidden" name="tournamentId" value={tournament.id} />
              <label htmlFor="tournament-status">Status do torneio
                <select id="tournament-status" name="registrationPhase" defaultValue={tournament.registrationPhase}>
                  <option value="EDITING">Em configuração</option>
                  <option value="REGISTRATIONS">Inscrições abertas</option>
                  <option value="LIVE">Em andamento</option>
                  <option value="FINISHED">Finalizado</option>
                </select>
              </label>
              <SubmitButton label="Atualizar status" pendingLabel="Atualizando..." className={viewStyles.button_button_small} />
            </SafeActionForm>
            <dl><div><dt>Organizador</dt><dd>{auth.arenaName}</dd></div><div><dt>Formato</dt><dd>{tournament.categories[0]?.competition ? formatLabel(tournament.categories[0].competition.format) : "A definir"}</dd></div><div><dt>Visibilidade</dt><dd>{tournament.creationMode === "PUBLIC" ? "Público" : "Privado"}</dd></div><div><dt>Atualizado em</dt><dd>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(tournament.updatedAt)}</dd></div></dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function formatLabel(format: "LEAGUE" | "THREE_GROUPS" | "FOUR_GROUPS" | "SIMPLE") {
  return { LEAGUE: "Liga", THREE_GROUPS: "3 grupos", FOUR_GROUPS: "4 grupos", SIMPLE: "Simples" }[format];
}
