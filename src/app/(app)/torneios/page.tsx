import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { ActiveTournamentCard } from "@/components/tournaments/active-tournament-card";
import { EmptyState } from "@/components/tournaments/empty-state";
import { StatusBadge } from "@/components/tournaments/status-badge";
import { TournamentDashboard } from "@/components/tournaments/tournament-dashboard";
import { TournamentSummaryCards } from "@/components/tournaments/tournament-summary-cards";
import { deleteTournamentAction } from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { getArenaDashboard } from "@/lib/services/tournament";

function getUpcomingMatches(matches: Array<{ id: string; label: string; manualStatus: string | null; scheduledTime: string | null; winnerPairId: string | null }>) {
  return matches
    .filter((match) => !match.winnerPairId)
    .sort((a, b) => (a.scheduledTime ?? "99:99").localeCompare(b.scheduledTime ?? "99:99"))
    .slice(0, 6);
}

function getMatchStatus(match: { manualStatus: string | null; winnerPairId: string | null }) {
  if (match.winnerPairId) return "FINISHED";
  if (match.manualStatus === "LIVE") return "LIVE";
  return "SCHEDULED";
}

export default async function TournamentsPage() {
  const auth = await requireModuleView("tournaments");
  const { activeTournament, tournamentHistory } = await getArenaDashboard(auth.arenaId);
  const upcomingMatches = activeTournament ? getUpcomingMatches(activeTournament.matches) : [];

  return (
    <TournamentDashboard>
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Módulo</p>
          <h1>Torneios</h1>
          <p className="muted">Gerencie campeonatos, inscrições, chaves e jogos da arena.</p>
        </div>
        <div className="section-actions">
          <Link href="/torneios/novo" className="button button-primary">Novo torneio</Link>
          <Link href="/torneios/rankings" className="button">Rankings</Link>
          <Link href="/torneios/inscricoes" className="button">Inscrições</Link>
        </div>
      </header>

      <TournamentSummaryCards
        hasActive={!!activeTournament}
        activeName={activeTournament?.name ?? ""}
        players={activeTournament?.entries.length ?? 0}
        matches={activeTournament?.matches.length ?? 0}
        finished={tournamentHistory.length}
      />

      <ActiveTournamentCard tournament={activeTournament} />

      <SectionCard title="Próximos jogos" description="Agenda compacta do torneio ativo.">
        {upcomingMatches.length ? (
          <div className="simple-list">
            {upcomingMatches.map((match) => (
              <div key={match.id} className="simple-item">
                <div className="match-copy">
                  <strong>{match.label}</strong>
                  <span>{match.scheduledTime ?? "Horário a definir"}</span>
                </div>
                <StatusBadge status={getMatchStatus(match)} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Sem jogos próximos" description="Quando os jogos forem gerados, eles aparecerão aqui." ctaLabel="Abrir torneio" ctaHref={activeTournament ? `/torneios/${activeTournament.id}` : "/torneios/novo"} />
        )}
      </SectionCard>

      <SectionCard title="Histórico recente" description="Torneios encerrados mais recentes.">
        {tournamentHistory.length ? (
          <div className="simple-list">
            {tournamentHistory.slice(0, 10).map((tournament) => (
              <div key={tournament.id} className="simple-item">
                <div className="match-copy">
                  <strong>{tournament.name}</strong>
                  <span>
                    Finalizado em {tournament.updatedAt.toLocaleDateString("pt-BR")} · {tournament._count.entries} inscritos · {tournament._count.matches} jogos
                  </span>
                </div>
                <div className="section-actions">
                  <Link href={`/torneios/${tournament.id}`} className="button">Ver detalhes</Link>
                  <SafeActionForm
                    action={deleteTournamentAction}
                    confirmKeyword="EXCLUIR"
                    confirmPrompt="Digite EXCLUIR para remover este torneio permanentemente."
                    successMessage="Torneio excluído."
                  >
                    <input type="hidden" name="tournamentId" value={tournament.id} />
                    <SubmitButton label="Excluir" pendingLabel="Excluindo..." className="button button-danger" />
                  </SafeActionForm>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Sem histórico ainda" description="Torneios finalizados aparecerão nesta área." />
        )}
      </SectionCard>
    </TournamentDashboard>
  );
}
