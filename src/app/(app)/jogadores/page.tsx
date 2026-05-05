import { PlayerForm } from "@/components/forms/player-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { TournamentParticipantsForm } from "@/components/forms/tournament-participants-form";
import { PlayerActionsCell } from "@/components/players/player-actions-cell";
import { SectionCard } from "@/components/section-card";
import { updatePlayerPointsAction, updateTournamentEntryPointsAction } from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { getArenaDashboard } from "@/lib/services/tournament";

export default async function PlayersPage() {
  const auth = await requireModuleView("players");
  const { players, activeTournament } = await getArenaDashboard(auth.arenaId);
  const activePlayers = players.filter((player) => player.active);
  const selectedPlayerIds = new Set(activeTournament?.entries.map((entry) => entry.playerId) ?? []);

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Participantes</p>
          <h1>Jogadores</h1>
          <p className="muted">
            Cadastre jogadores, escolha quem vai jogar no torneio atual e ajuste as pontuações usadas na competição.
          </p>
        </div>
      </header>

      <SectionCard
        title="Adicionar jogador"
        description="Inclua novos participantes e defina uma pontuação inicial para o ranking."
      >
        <PlayerForm />
      </SectionCard>

      {activeTournament ? (
        <>
          <SectionCard
            title={`Participantes do torneio: ${activeTournament.name}`}
            description="Selecione manualmente quem vai disputar esta edição. Alterar essa lista limpa duplas, grupos e jogos já montados."
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
            title={`Configuração do torneio: ${activeTournament.name}`}
            description="A pontuação do torneio começa zerada. Ajuste a força inicial usada para montar duplas e grupos."
          >
            {activeTournament.entries.length ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pos.</th>
                    <th>Jogador</th>
                    <th>Pontos no torneio</th>
                    <th>Força inicial</th>
                    <th>Pontos no cadastro</th>
                    <th>Ajustar força</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTournament.entries.map((entry, index) => (
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
            ) : (
              <p className="muted">
                Ainda não há jogadores selecionados para esta edição do torneio.
              </p>
            )}
          </SectionCard>
        </>
      ) : null}

      <SectionCard
        title="Cadastro de jogadores"
        description="Consulte a lista completa, edite nomes e mantenha o cadastro sempre atualizado."
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Jogador</th>
              <th>Pontos</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr key={player.id}>
                <td>#{index + 1}</td>
                <td>
                  <PlayerActionsCell
                    playerId={player.id}
                    playerName={player.name}
                    playerPoints={player.points}
                    playerPhotoUrl={player.photoUrl}
                    active={player.active}
                  />
                </td>
                <td>
                  <form action={updatePlayerPointsAction} className="inline-form player-points-form">
                    <input type="hidden" name="playerId" value={player.id} />
                    <input
                      name="points"
                      type="number"
                      min="0"
                      defaultValue={player.points}
                      aria-label={`Pontuação de ${player.name}`}
                      className="player-points-input"
                    />
                    <SubmitButton label="Salvar" pendingLabel="..." className="button" />
                  </form>
                </td>
                <td>
                  <span className={`player-status-pill${player.active ? "" : " player-status-pill-inactive"}`}>
                    {player.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
