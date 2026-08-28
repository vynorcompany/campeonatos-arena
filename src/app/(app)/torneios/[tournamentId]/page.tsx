import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { CategoryList } from "@/components/tournaments/category-list";
import { EventIcon } from "@/components/tournaments/event-icon";
import { EventQuickActions } from "@/components/tournaments/event-quick-actions";
import { PublicRegistrationLinkActions } from "@/components/tournaments/public-registration-link-actions";
import { deleteTournamentAction } from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type TournamentDetailPageProps = {
  params: { tournamentId: string };
  searchParams?: { action?: string };
};

export default async function TournamentDetailPage({
  params,
  searchParams,
}: TournamentDetailPageProps) {
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
          where: { active: true },
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
  const eventState = tournament.status === "PUBLISHED" ? "Publicado" : tournament.status === "FINISHED" ? "Finalizado" : "Editando";
  const initialQuickAction = searchParams?.action === "categories" ? "categories" : null;

  return (
    <div className="event-dashboard">
      <header className="event-operation-header">
        <div className="event-operation-title">
          <p className="eyebrow">Evento</p>
          <h1>{tournament.name}</h1>
          <p className="event-breadcrumb"><Link href="/torneios">Eventos</Link><EventIcon name="chevron" size={13} />{tournament.name}</p>
        </div>
        <div className="event-operation-actions">
          <span className="event-editing-badge">{eventState} <EventIcon name="edit" size={14} /></span>
          {tournament.creationMode === "PUBLIC" ? (
             <PublicRegistrationLinkActions slug={tournament.publicSlug} />
          ) : null}
          <Link
            href={`/classificacao/${tournament.arena.slug}`}
            className="button"
            target="_blank"
            rel="noreferrer"
          >
            <EventIcon name="external" />Ver página pública
          </Link>
          <Link href="/torneios" className="button">
             <EventIcon name="arrow-left" />Voltar aos eventos
           </Link>
          <SafeActionForm
            action={deleteTournamentAction}
            confirmKeyword="EXCLUIR"
            confirmPrompt="Digite EXCLUIR para remover este evento permanentemente."
            successMessage="Evento excluído."
          >
            <input type="hidden" name="tournamentId" value={tournament.id} />
            <SubmitButton
              label="Excluir evento"
              pendingLabel="Excluindo..."
              className="button button-danger"
            />
          </SafeActionForm>
        </div>
      </header>

      <section className="event-metrics-grid" aria-label="Resumo do evento">
        <article className="event-metric-card"><span className="event-metric-icon"><EventIcon name="edit" size={24} /></span><div><small>Status do evento</small><strong>{eventState}</strong><p>O evento está visível apenas para administradores.</p></div></article>
        <article className="event-metric-card"><span className="event-metric-icon"><EventIcon name="trophy" size={24} /></span><div><small>Categorias</small><strong>{tournament.categories.length}</strong><p>Categorias configuradas</p></div></article>
        <article className="event-metric-card"><span className="event-metric-icon event-metric-icon-success"><EventIcon name="users" size={24} /></span><div><small>Inscrições / duplas</small><strong>{pairCount}</strong><p>Duplas inscritas</p></div></article>
        <article className="event-metric-card"><span className="event-metric-icon event-metric-icon-purple"><EventIcon name="calendar" size={24} /></span><div><small>Criado em</small><strong>{createdAt}</strong><p>Informação do evento</p></div></article>
      </section>

      <div className="event-detail-grid">
        <div className="event-main-column">
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
        </div>
        <aside className="event-side-column">
          <EventQuickActions
            tournament={tournament}
            publicPageUrl={`/classificacao/${tournament.arena.slug}`}
            categories={tournament.categories.map((category) => ({ id: category.id, name: category.name, pairCount: category.competition?._count.pairs ?? 0 }))}
            categoryManager={{
              tournamentId: tournament.id, defaultName: tournament.name, defaultDescription: tournament.description, defaultPublicSlug: tournament.publicSlug,
              defaultRegistrationPhase: tournament.registrationPhase, defaultCreationMode: tournament.creationMode as "MANUAL" | "PUBLIC", defaultGroupCount: tournament.groupCount,
              defaultPairsPerGroup: tournament.pairsPerGroup, defaultPriceFirstCents: tournament.priceFirstCents, defaultPriceSecondCents: tournament.priceSecondCents,
              defaultPriceThirdCents: tournament.priceThirdCents, defaultBlockCategoryGap: tournament.blockCategoryGap, defaultMaxCategoryGap: tournament.maxCategoryGap,
              defaultRankingId: tournament.rankingId ?? "", defaultCategories: tournament.categories.map((category) => ({ name: category.name, groupCount: category.groupCount, pairsPerGroup: category.pairsPerGroup, priceSecondCents: category.priceSecondCents, priceThirdCents: category.priceThirdCents, hasCompetition: Boolean(category.competition) }))
            }}
            initialAction={initialQuickAction}
          />
          <section className="event-information">
            <header><EventIcon name="info" /><h2>Informações do evento</h2></header>
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
