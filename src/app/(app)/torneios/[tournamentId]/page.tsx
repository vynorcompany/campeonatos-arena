import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { TournamentCategoryManagerForm } from "@/components/forms/tournament-category-manager-form";
import { CategoryList } from "@/components/tournaments/category-list";
import { PublicRegistrationLinkActions } from "@/components/tournaments/public-registration-link-actions";
import { StatusBadge } from "@/components/tournaments/status-badge";
import { TournamentEventEditForm } from "@/components/tournaments/tournament-event-edit-form";
import { deleteTournamentAction } from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type TournamentDetailPageProps = {
  params: { tournamentId: string };
};

export default async function TournamentDetailPage({
  params,
}: TournamentDetailPageProps) {
  const auth = await requireModuleView("tournaments");
  const [tournament] = await Promise.all([
    prisma.tournament.findFirst({
      where: {
        id: params.tournamentId,
        arenaId: auth.arenaId,
      },
      include: {
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

  return (
    <div className="stack-md">
      <header className="page-header t-sticky-head">
        <div className="stack-xs">
          <p className="eyebrow">Evento</p>
          <h1>{tournament.name}</h1>
          <p className="muted">
            {tournament.categories.length} categorias · {finishedCategoryCount}{" "}
            concluídas
          </p>
        </div>
        <div className="section-actions">
          <StatusBadge status={tournament.registrationPhase} />
          {tournament.creationMode === "PUBLIC" ? (
            <PublicRegistrationLinkActions slug={tournament.publicSlug} />
          ) : null}
          <Link href="/torneios" className="button">
            Voltar aos eventos
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

      <details className="section-card">
        <summary>
          <strong>Editar evento</strong>
        </summary>
        <div style={{ marginTop: "1rem" }}>
          <TournamentEventEditForm tournament={tournament} />
        </div>
      </details>

      <CategoryList
        tournamentId={tournament.id}
        categories={tournament.categories.map((category) => ({
          id: category.id,
          name: category.name,
          competition: category.competition
            ? {
                format: category.competition.format,
                pairCount: category.competition._count.pairs,
              }
            : null,
        }))}
      />

      <details className="section-card">
        <summary>
          <strong>Gerenciar categorias</strong>
        </summary>
        <div style={{ marginTop: "1rem" }}>
          <TournamentCategoryManagerForm
            tournamentId={tournament.id}
            defaultName={tournament.name}
            defaultDescription={tournament.description}
            defaultPublicSlug={tournament.publicSlug}
            defaultRegistrationPhase={tournament.registrationPhase}
            defaultCreationMode={
              tournament.creationMode as "MANUAL" | "PUBLIC"
            }
            defaultGroupCount={tournament.groupCount}
            defaultPairsPerGroup={tournament.pairsPerGroup}
            defaultPriceFirstCents={tournament.priceFirstCents}
            defaultPriceSecondCents={tournament.priceSecondCents}
            defaultPriceThirdCents={tournament.priceThirdCents}
            defaultBlockCategoryGap={tournament.blockCategoryGap}
            defaultMaxCategoryGap={tournament.maxCategoryGap}
            defaultRankingId={tournament.rankingId ?? ""}
            defaultCategories={tournament.categories.map((category) => ({
              name: category.name,
              groupCount: category.groupCount,
              pairsPerGroup: category.pairsPerGroup,
              priceSecondCents: category.priceSecondCents,
              priceThirdCents: category.priceThirdCents,
              hasCompetition: Boolean(category.competition),
            }))}
          />
        </div>
      </details>
    </div>
  );
}
