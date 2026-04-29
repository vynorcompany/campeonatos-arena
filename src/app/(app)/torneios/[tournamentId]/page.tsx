import { notFound } from "next/navigation";
import { BracketOverview } from "@/components/bracket-overview";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { deleteTournamentAction } from "@/lib/actions/tournament";
import { requireArenaAccess } from "@/lib/auth/session";
import { getFinishedTournamentDetails } from "@/lib/services/tournament";

const stageLabels: Record<string, string> = {
  GROUP: "Fase de grupos",
  QUARTERFINAL: "Mata-mata: quartas",
  SEMIFINAL: "Mata-mata: semifinais",
  FINAL: "Mata-mata: final"
};

type HistoryPageProps = {
  params: {
    tournamentId: string;
  };
};

function formatMatchScore(homeScore: number | null, awayScore: number | null) {
  if (homeScore === null || awayScore === null) {
    return "Placar não registrado";
  }

  return `${homeScore} x ${awayScore}`;
}

function renderMatchSection(
  title: string,
  description: string,
  matches: Array<{
    id: string;
    label: string;
    courtName: string | null;
    homeScore: number | null;
    awayScore: number | null;
    homePair: { name: string } | null;
    awayPair: { name: string } | null;
    winnerPair: { name: string } | null;
  }>
) {
  return (
    <SectionCard title={title} description={description}>
      {matches.length ? (
        <div className="simple-list">
          {matches.map((match) => (
            <div key={match.id} className="simple-item">
              <div className="match-copy">
                <strong>{match.label}</strong>
                <span>
                  {(match.homePair?.name ?? "A definir")} x {(match.awayPair?.name ?? "A definir")}
                </span>
                <span>
                  {formatMatchScore(match.homeScore, match.awayScore)}
                  {match.winnerPair ? ` • Vencedor: ${match.winnerPair.name}` : ""}
                  {match.courtName ? ` • Quadra: ${match.courtName}` : ""}
                </span>
              </div>
              <span className="pill">{match.winnerPair ? "Encerrado" : "Sem resultado"}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Nenhum jogo registrado nesta fase.</p>
      )}
    </SectionCard>
  );
}

export default async function TournamentHistoryDetailPage({ params }: HistoryPageProps) {
  const auth = await requireArenaAccess();
  const tournament = await getFinishedTournamentDetails(params.tournamentId, auth.arenaId);

  if (!tournament) {
    notFound();
  }

  const groupedMatches = tournament.matches.filter((match) => match.stage === "GROUP");
  const knockoutMatches = tournament.matches.filter((match) => match.stage !== "GROUP");
  const quarterfinals = knockoutMatches.filter((match) => match.stage === "QUARTERFINAL");
  const semifinals = knockoutMatches.filter((match) => match.stage === "SEMIFINAL");
  const final = knockoutMatches.filter((match) => match.stage === "FINAL");
  const completedMatches = tournament.matches.filter((match) => match.winnerPairId !== null).length;

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Histórico</p>
          <h1>{tournament.name}</h1>
          <p className="muted">
            Revise os jogadores, as duplas, os grupos e todos os resultados deste torneio.
          </p>
        </div>
        <div className="section-actions">
          <span className="pill">Finalizado</span>
          <form action={deleteTournamentAction}>
            <input type="hidden" name="tournamentId" value={tournament.id} />
            <SubmitButton label="Excluir torneio" pendingLabel="Excluindo..." className="button button-danger" />
          </form>
        </div>
      </header>

      <div className="stats-grid">
        <StatCard label="Jogadores" value={tournament.entries.length} caption="Participantes do torneio" />
        <StatCard label="Duplas" value={tournament.pairs.length} caption="Duplas formadas" />
        <StatCard label="Grupos" value={tournament.groups.length} caption="Grupos montados" />
        <StatCard label="Jogos" value={completedMatches} caption={`${completedMatches}/${tournament.matches.length} com resultado`} />
      </div>

      <div className="two-column-grid">
        <SectionCard title="Força inicial do torneio" description="Pontuação-base usada para montar as duplas e equilibrar os grupos.">
          {tournament.entries.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pos.</th>
                  <th>Jogador</th>
                  <th>Pontos</th>
                </tr>
              </thead>
              <tbody>
                {tournament.entries.map((entry, index) => (
                  <tr key={entry.id}>
                    <td>#{index + 1}</td>
                    <td>{entry.player.name}</td>
                    <td>{entry.seedPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Não há ranking registrado para este torneio.</p>
          )}
        </SectionCard>

        <SectionCard title="Duplas" description="Composição e pontuação total de cada dupla.">
          {tournament.pairs.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dupla</th>
                  <th>Pontos</th>
                  <th>Grupo</th>
                </tr>
              </thead>
              <tbody>
                {tournament.pairs.map((pair) => (
                  <tr key={pair.id}>
                    <td>{pair.name}</td>
                    <td>{pair.totalPoints}</td>
                    <td>{pair.group?.name ?? "Sem grupo"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Não há duplas registradas para este torneio.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Grupos" description="Confira como as duplas ficaram distribuídas.">
        {tournament.groups.length ? (
          <div className="group-grid">
            {tournament.groups.map((group) => (
              <SectionCard key={group.id} title={group.name} description={`${group.pairs.length} duplas`}>
                <div className="group-list">
                  {group.pairs.map((pair) => (
                    <div key={pair.id} className="group-item">
                      <strong>{pair.name}</strong>
                      <span>{pair.totalPoints} pts</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ))}
          </div>
        ) : (
          <p className="muted">Não há grupos registrados neste torneio.</p>
        )}
      </SectionCard>

      {renderMatchSection("Resultados da fase de grupos", `${groupedMatches.length} jogo(s) registrados.`, groupedMatches)}
      {renderMatchSection(stageLabels.QUARTERFINAL, `${quarterfinals.length} jogo(s) registrados.`, quarterfinals)}
      {renderMatchSection(stageLabels.SEMIFINAL, `${semifinals.length} jogo(s) registrados.`, semifinals)}
      {renderMatchSection(stageLabels.FINAL, `${final.length} jogo(s) registrados.`, final)}

      <SectionCard title="Chave final" description="Veja a estrutura completa do mata-mata deste torneio.">
        <BracketOverview
          groupCount={tournament.groupCount}
          groups={tournament.groups}
          matches={knockoutMatches}
        />
      </SectionCard>
    </div>
  );
}
