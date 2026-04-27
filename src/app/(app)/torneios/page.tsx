import Link from "next/link";
import { BracketOverview } from "@/components/bracket-overview";
import { SubmitButton } from "@/components/forms/submit-button";
import { TournamentForm } from "@/components/forms/tournament-form";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import {
  deleteTournamentAction,
  finishTournamentAction,
  generateGroupsAction,
  generateMatchesAction
} from "@/lib/actions/tournament";
import { requireArenaAccess } from "@/lib/auth/session";
import { getArenaDashboard } from "@/lib/services/tournament";

const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  READY_FOR_DRAW: "Pronto para sorteio",
  GROUPS_DEFINED: "Grupos definidos",
  MATCHES_DEFINED: "Jogos definidos",
  IN_PROGRESS: "Em andamento",
  FINISHED: "Finalizado"
};

export default async function TournamentsPage() {
  const auth = await requireArenaAccess();
  const { activeTournament, tournamentHistory } = await getArenaDashboard(auth.arenaId);
  const groupedMatches = activeTournament?.matches.filter((match) => match.stage === "GROUP") ?? [];
  const knockoutMatches = activeTournament?.matches.filter((match) => match.stage !== "GROUP") ?? [];

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Campeonatos</p>
          <h1>Torneios</h1>
          <p className="muted">
            Crie novos torneios, acompanhe o campeonato atual e consulte os torneios já encerrados.
          </p>
        </div>
        <span className="pill">{activeTournament ? statusLabels[activeTournament.status] : "Pronto para criar um novo torneio"}</span>
      </header>

      <div className="stats-grid">
        <StatCard label="Torneio atual" value={activeTournament ? 1 : 0} caption={activeTournament?.name ?? "Nenhum em andamento"} />
        <StatCard label="Grupos" value={activeTournament?.groups.length ?? 0} caption="No torneio atual" />
        <StatCard label="Jogos" value={activeTournament?.matches.length ?? 0} caption="Programados e realizados" />
        <StatCard label="Histórico" value={tournamentHistory.length} caption="Torneios concluídos" />
      </div>

      <div className="two-column-grid">
        <SectionCard
          title="Novo torneio"
          description="Defina o nome e a quantidade de grupos para começar uma nova competição."
        >
          {activeTournament ? (
            <div className="stack-md">
              <div className="form-hint-box">
                <strong>Há um torneio em andamento</strong>
                <p className="muted">
                  Finalize <strong>{activeTournament.name}</strong> para liberar a criação do próximo torneio.
                </p>
              </div>

              <div className="simple-list">
                <div className="simple-item">
                  <strong>Status</strong>
                  <span>{statusLabels[activeTournament.status]}</span>
                </div>
                <div className="simple-item">
                  <strong>Grupos previstos</strong>
                  <span>{activeTournament.groupCount}</span>
                </div>
                <div className="simple-item">
                  <strong>Próximo passo</strong>
                  <span>Encerrar o torneio atual</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="stack-md">
              <TournamentForm />
              <div className="form-hint-box">
                <strong>Tudo pronto para começar</strong>
                <p className="muted">
                  Depois de criar o torneio, você poderá escolher os participantes, montar as duplas, distribuir os grupos e gerar os jogos.
                </p>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Resumo do torneio" description="Visão rápida do campeonato atual.">
          {activeTournament ? (
            <div className="simple-list">
              <div className="simple-item">
                <strong>Status</strong>
                <span>{statusLabels[activeTournament.status]}</span>
              </div>
              <div className="simple-item">
                <strong>Jogadores</strong>
                <span>{activeTournament.entries.length}</span>
              </div>
              <div className="simple-item">
                <strong>Fase de grupos</strong>
                <span>{groupedMatches.length} jogos</span>
              </div>
              <div className="simple-item">
                <strong>Mata-mata</strong>
                <span>{knockoutMatches.length} jogos</span>
              </div>
            </div>
          ) : (
            <div className="simple-list">
              <div className="simple-item">
                <strong>Status</strong>
                <span>Aguardando novo torneio</span>
              </div>
              <div className="simple-item">
                <strong>Torneios concluídos</strong>
                <span>{tournamentHistory.length}</span>
              </div>
              <div className="simple-item">
                <strong>Próximo passo</strong>
                <span>Criar um novo torneio</span>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {activeTournament ? (
        <SectionCard
          title={activeTournament.name}
          description={`Siga as etapas para organizar o torneio com ${activeTournament.groupCount} grupos.`}
        >
          <div className="timeline">
            <div className="timeline-step">
              <span className="pill">1</span>
              <div>
                <strong>Escolher participantes</strong>
                <p className="muted">Selecione manualmente quais jogadores entram nesta edição do torneio.</p>
              </div>
              <Link href="/jogadores" className="button button-primary">
                Abrir jogadores
              </Link>
            </div>

            <div className="timeline-step">
              <span className="pill">2</span>
              <div>
                <strong>Montar duplas</strong>
                <p className="muted">Selecione manualmente as duplas e mantenha a força total de cada uma para balancear os grupos.</p>
              </div>
              <Link href="/duplas" className="button button-primary">
                Abrir duplas
              </Link>
            </div>

            <div className="timeline-step">
              <span className="pill">3</span>
              <div>
                <strong>Montar grupos</strong>
                <p className="muted">Distribua as duplas por força e respeite o mínimo necessário em cada grupo.</p>
              </div>
              <form action={generateGroupsAction}>
                <input type="hidden" name="tournamentId" value={activeTournament.id} />
                <SubmitButton label="Montar grupos" pendingLabel="Montando..." className="button button-primary" />
              </form>
            </div>

            <div className="timeline-step">
              <span className="pill">4</span>
              <div>
                <strong>Gerar jogos</strong>
                <p className="muted">Crie os confrontos da fase de grupos e a chave do mata-mata.</p>
              </div>
              <form action={generateMatchesAction}>
                <input type="hidden" name="tournamentId" value={activeTournament.id} />
                <SubmitButton label="Gerar jogos" pendingLabel="Gerando..." className="button button-primary" />
              </form>
            </div>

            <div className="timeline-step timeline-step-finish">
              <span className="pill">5</span>
              <div>
                <strong>Encerrar torneio</strong>
                <p className="muted">Finalize o campeonato quando todos os resultados estiverem concluídos.</p>
              </div>
              <div className="section-actions">
                <form action={finishTournamentAction}>
                  <input type="hidden" name="tournamentId" value={activeTournament.id} />
                  <SubmitButton label="Encerrar torneio" pendingLabel="Encerrando..." className="button" />
                </form>
                <form action={deleteTournamentAction}>
                  <input type="hidden" name="tournamentId" value={activeTournament.id} />
                  <SubmitButton label="Excluir torneio" pendingLabel="Excluindo..." className="button button-danger" />
                </form>
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {activeTournament ? (
        <SectionCard title="Chave do torneio" description="Acompanhe a estrutura atual do campeonato.">
          <BracketOverview
            groupCount={activeTournament.groupCount}
            groups={activeTournament.groups}
            matches={knockoutMatches}
          />
        </SectionCard>
      ) : null}

      <SectionCard
        title="Torneios encerrados"
        description="Acesse o histórico completo dos campeonatos já finalizados."
      >
        {tournamentHistory.length ? (
          <div className="simple-list">
            {tournamentHistory.map((tournament) => (
              <div key={tournament.id} className="simple-item">
                <div className="match-copy">
                  <strong>{tournament.name}</strong>
                  <span>
                    Finalizado em {tournament.updatedAt.toLocaleDateString("pt-BR")} • {tournament._count.entries} jogadores • {tournament._count.matches} jogos
                  </span>
                </div>
                <div className="section-actions">
                  <span className="pill">Encerrado</span>
                  <Link href={`/torneios/${tournament.id}`} className="button">
                    Ver detalhes
                  </Link>
                  <form action={deleteTournamentAction}>
                    <input type="hidden" name="tournamentId" value={tournament.id} />
                    <SubmitButton label="Excluir" pendingLabel="Excluindo..." className="button button-danger" />
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Ainda não há torneios finalizados.</p>
        )}
      </SectionCard>
    </div>
  );
}
