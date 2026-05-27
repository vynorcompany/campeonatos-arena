import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import {
  TournamentBracketTab,
  TournamentCategoriesTab,
  TournamentGamesTab,
  TournamentGroupsTab,
  TournamentOverviewTab,
  TournamentPairsTab,
  TournamentParticipantsTab,
  TournamentResultsTab,
  TournamentSettingsTab
} from "@/components/tournaments/tournament-detail-tabs";
import { TournamentDetailLayout } from "@/components/tournaments/tournament-detail-layout";
import { PublicRegistrationLinkActions } from "@/components/tournaments/public-registration-link-actions";
import { StatusBadge } from "@/components/tournaments/status-badge";
import { type TournamentTabKey } from "@/components/tournaments/tournament-tabs";
import {
  deleteTournamentAction,
  finishTournamentAction,
  updateTournamentStatusAction,
  updateTournamentRegistrationPhaseAction
} from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getTournamentDetailsById } from "@/lib/services/tournament";

type TournamentDetailPageProps = {
  params: { tournamentId: string };
  searchParams?: { tab?: string };
};

const validTabs: TournamentTabKey[] = ["overview", "categories", "participants", "pairs", "groups", "games", "bracket", "results", "settings"];

export default async function TournamentDetailPage({ params, searchParams }: TournamentDetailPageProps) {
  const auth = await requireModuleView("tournaments");
  const tournament = await getTournamentDetailsById(params.tournamentId, auth.arenaId);
  if (!tournament) notFound();

  const tab = validTabs.includes((searchParams?.tab as TournamentTabKey) ?? "overview")
    ? ((searchParams?.tab as TournamentTabKey) ?? "overview")
    : "overview";

  const rankings = await prisma.rankingProfile.findMany({
    where: { arenaId: auth.arenaId },
    orderBy: { name: "asc" },
    select: { id: true, name: true }
  });

  return (
    <div className="stack-md">
      <header className="page-header t-sticky-head">
        <div className="stack-xs">
          <p className="eyebrow">Torneio</p>
          <h1>{tournament.name}</h1>
          <p className="muted">Fase atual: {tournament.registrationPhase}</p>
        </div>
        <div className="section-actions">
          <StatusBadge status={tournament.status} />
          {tournament.registrationPhase === "REGISTRATIONS" ? <PublicRegistrationLinkActions slug={tournament.publicSlug} /> : null}
          <Link href={`/torneios/${tournament.id}?tab=settings`} className="button">Editar torneio</Link>
          <form action={updateTournamentRegistrationPhaseAction} className="section-actions">
            <input type="hidden" name="tournamentId" value={tournament.id} />
            <select
              name="registrationPhase"
              defaultValue={tournament.registrationPhase}
              className="button"
              aria-label="Selecionar fase do torneio"
              style={{ minWidth: "190px" }}
            >
              <option value="REGISTRATIONS">Inscricoes abertas</option>
              <option value="EDITING">Editando chaveamentos</option>
              <option value="LIVE">Em andamento</option>
              <option value="FINISHED">Finalizado</option>
            </select>
            <SubmitButton label="Atualizar fase" pendingLabel="Salvando..." className="button" />
          </form>
          <form action={updateTournamentStatusAction} className="section-actions">
            <input type="hidden" name="tournamentId" value={tournament.id} />
            <select
              name="status"
              defaultValue={tournament.status}
              className="button"
              aria-label="Selecionar status do torneio"
              style={{ minWidth: "190px" }}
            >
              <option value="DRAFT">Rascunho</option>
              <option value="READY_FOR_DRAW">Pronto para sorteio</option>
              <option value="GROUPS_DEFINED">Grupos definidos</option>
              <option value="MATCHES_DEFINED">Jogos definidos</option>
              <option value="FINISHED">Finalizado</option>
            </select>
            <SubmitButton label="Atualizar status" pendingLabel="Salvando..." className="button" />
          </form>
          <form action={finishTournamentAction}>
            <input type="hidden" name="tournamentId" value={tournament.id} />
            <SubmitButton label="Encerrar torneio" pendingLabel="..." className="button" />
          </form>
          <SafeActionForm
            action={deleteTournamentAction}
            confirmKeyword="EXCLUIR"
            confirmPrompt="Digite EXCLUIR para remover este torneio permanentemente."
            successMessage="Torneio excluido."
          >
            <input type="hidden" name="tournamentId" value={tournament.id} />
            <SubmitButton label="Excluir torneio" pendingLabel="..." className="button button-danger" />
          </SafeActionForm>
        </div>
      </header>

      <TournamentDetailLayout tournamentId={tournament.id} activeTab={tab}>
        <SectionCard title="Area do torneio" description="Cada aba separa uma responsabilidade operacional.">
          {tab === "overview" ? <TournamentOverviewTab tournament={tournament} /> : null}
          {tab === "categories" ? <TournamentCategoriesTab tournament={tournament} /> : null}
          {tab === "participants" ? <TournamentParticipantsTab tournament={tournament} /> : null}
          {tab === "pairs" ? <TournamentPairsTab tournament={tournament} /> : null}
          {tab === "groups" ? <TournamentGroupsTab tournament={tournament} /> : null}
          {tab === "games" ? <TournamentGamesTab tournament={tournament} /> : null}
          {tab === "bracket" ? <TournamentBracketTab tournament={tournament} /> : null}
          {tab === "results" ? <TournamentResultsTab tournament={tournament} /> : null}
          {tab === "settings" ? <TournamentSettingsTab tournament={tournament} rankings={rankings} /> : null}
        </SectionCard>
      </TournamentDetailLayout>
    </div>
  );
}
