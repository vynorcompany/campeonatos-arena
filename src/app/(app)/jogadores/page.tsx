import { PlayerForm } from "@/components/forms/player-form";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { TournamentParticipantsForm } from "@/components/forms/tournament-participants-form";
import { LiveQueryInput } from "@/components/forms/live-query-input";
import { PlayerActionsCell } from "@/components/players/player-actions-cell";
import { SectionCard } from "@/components/section-card";
import { resetPlayerRankingAction, updatePlayerPointsAction, updateTournamentEntryPointsAction } from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { getArenaDashboard } from "@/lib/services/tournament";

type PlayersPageProps = {
  searchParams?: {
    q?: string;
  };
};

export default async function PlayersPage({ searchParams }: PlayersPageProps) {
  const auth = await requireModuleView("players");
  const { players, activeTournament } = await getArenaDashboard(auth.arenaId);
  const query = (searchParams?.q ?? "").trim().toLowerCase();

  const sortedPlayers = [...players].sort((a, b) => {
    const aHit = query ? a.name.toLowerCase().includes(query) : true;
    const bHit = query ? b.name.toLowerCase().includes(query) : true;
    if (aHit !== bHit) return aHit ? -1 : 1;
    return b.points - a.points;
  });

  const activePlayers = players.filter((player) => player.active);
  const selectedPlayerIds = new Set(activeTournament?.entries.map((entry) => entry.playerId) ?? []);

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Participantes</p>
          <h1>Jogadores</h1>
          <p className="muted">Cadastre jogadores e ajuste pontuacoes do torneio e ranking.</p>
        </div>
        <SafeActionForm
          action={resetPlayerRankingAction}
          confirmKeyword="RESETAR"
          confirmPrompt="Digite RESETAR para confirmar o reset da pontuacao geral dos jogadores."
          successMessage="Pontuacao resetada."
        >
          <button type="submit" className="button button-danger">Resetar pontuacao</button>
        </SafeActionForm>
      </header>

      <SectionCard title="Adicionar jogador" description="Inclua novos participantes e defina pontuacao inicial.">
        <PlayerForm />
      </SectionCard>

      {activeTournament ? (
        <>
          <SectionCard
            title={`Participantes do torneio: ${activeTournament.name}`}
            description="Selecione quem vai disputar esta edicao. Alterar limpa duplas, grupos e jogos ja montados."
          >
            <TournamentParticipantsForm
              tournamentId={activeTournament.id}
              players={activePlayers.map((player) => ({
                id: player.id,
                name: player.name,
                points: player.points,
                checked: selectedPlayerIds.has(player.id)
              }))}
            />
          </SectionCard>

          <SectionCard
            title={`Configuracao do torneio: ${activeTournament.name}`}
            description="Ajuste a forca inicial usada para montar duplas e grupos."
          >
            {activeTournament.entries.length ? (
              <table className="data-table">
                <thead><tr><th>Pos.</th><th>Jogador</th><th>Pontos no torneio</th><th>Forca inicial</th><th>Pontos no cadastro</th><th>Ajustar</th></tr></thead>
                <tbody>
                  {activeTournament.entries
                    .sort((a, b) => {
                      const aHit = query ? a.player.name.toLowerCase().includes(query) : true;
                      const bHit = query ? b.player.name.toLowerCase().includes(query) : true;
                      if (aHit !== bHit) return aHit ? -1 : 1;
                      return 0;
                    })
                    .map((entry, index) => (
                      <tr key={entry.id}>
                        <td>#{index + 1}</td>
                        <td>{entry.player.name}</td>
                        <td>{entry.tournamentPoints}</td>
                        <td>{entry.seedPoints}</td>
                        <td>{entry.player.points}</td>
                        <td>
                          <form action={updateTournamentEntryPointsAction} className="inline-form">
                            <input type="hidden" name="entryId" value={entry.id} />
                            <input name="points" type="number" min="0" defaultValue={entry.seedPoints} />
                            <SubmitButton label="Salvar" pendingLabel="..." className="button" />
                          </form>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : <p className="muted">Ainda nao ha jogadores selecionados para esta edicao.</p>}
          </SectionCard>
        </>
      ) : null}

      <SectionCard title="Cadastro de jogadores" description="Digite para trazer o jogador para o topo da lista.">
        <div className="inline-form" style={{ marginBottom: "0.75rem" }}>
          <LiveQueryInput
            name="q"
            defaultValue={searchParams?.q ?? ""}
            placeholder="Pesquisar jogador por nome"
            ariaLabel="Pesquisar jogador"
          />
        </div>

        <table className="data-table">
          <thead><tr><th>Pos.</th><th>Jogador</th><th>Pontos</th><th>Status</th></tr></thead>
          <tbody>
            {sortedPlayers.map((player, index) => (
              <tr key={player.id}>
                <td>#{index + 1}</td>
                <td>
                  <PlayerActionsCell playerId={player.id} playerName={player.name} playerPoints={player.points} playerPhotoUrl={player.photoUrl} active={player.active} />
                </td>
                <td>
                  <form action={updatePlayerPointsAction} className="inline-form player-points-form">
                    <input type="hidden" name="playerId" value={player.id} />
                    <input name="points" type="number" min="0" defaultValue={player.points} aria-label={`Pontuacao de ${player.name}`} className="player-points-input" />
                    <SubmitButton label="Salvar" pendingLabel="..." className="button" />
                  </form>
                </td>
                <td><span className={`player-status-pill${player.active ? "" : " player-status-pill-inactive"}`}>{player.active ? "Ativo" : "Inativo"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}


