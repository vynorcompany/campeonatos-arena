import Link from "next/link";
import { ManualPairForm } from "@/components/forms/manual-pair-form";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { deleteTournamentPairAction, updateTournamentPairAction } from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { getArenaDashboard } from "@/lib/services/tournament";

export default async function PairsPage() {
  const auth = await requireModuleView("pairs");
  const { activeTournament } = await getArenaDashboard(auth.arenaId);
  const pairedPlayerIds = new Set(
    activeTournament?.pairs.flatMap((pair) => pair.players.map((player) => player.playerId)) ?? []
  );
  const availableEntries =
    activeTournament?.entries.filter((entry) => !pairedPlayerIds.has(entry.playerId)) ?? [];
  const allEntries = activeTournament?.entries ?? [];

  function PlayerPhotoStack({ players }: { players: Array<{ player: { name: string; photoUrl: string } }> }) {
    return (
      <div className="pair-photo-stack" aria-hidden="true">
        {players.map(({ player }) => (
          <span className="pair-player-photo" key={player.name}>
            {player.photoUrl ? <img src={player.photoUrl} alt="" /> : player.name.slice(0, 1).toUpperCase()}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Duplas</p>
          <h1>Formação de duplas</h1>
          <p className="muted">
            Monte as duplas manualmente e use a pontuação delas como base para equilibrar os grupos.
          </p>
        </div>
      </header>

      {!activeTournament ? (
        <SectionCard title="Nenhum torneio em andamento">
          <p className="muted">Crie um torneio para começar a formar as duplas.</p>
        </SectionCard>
      ) : (
        <>
          <SectionCard title="Preparar duplas" description="Primeiro defina quem participa do torneio e depois selecione manualmente quem joga junto.">
            <div className="section-actions">
              <Link href={`/torneios/${activeTournament.id}?tab=participants`} className="button">
                Gerenciar inscritos do torneio
              </Link>
            </div>

            {!activeTournament.entries.length && activeTournament.publicRegistrations.length ? (
              <div className="form-hint-box">
                <strong>Fluxo por inscrição pública detectado</strong>
                <p className="muted">
                  Este torneio já possui inscrições. Gerencie participantes e categorias direto na aba do torneio antes de formar duplas.
                </p>
              </div>
            ) : null}

            <ManualPairForm
              tournamentId={activeTournament.id}
              players={availableEntries.map((entry) => ({
                id: entry.playerId,
                name: entry.player.name,
                points: entry.seedPoints
              }))}
            />
          </SectionCard>

          <SectionCard title="Jogadores livres" description="Participantes do torneio que ainda não foram associados a nenhuma dupla.">
            {availableEntries.length ? (
              <div className="group-list">
                {availableEntries.map((entry) => (
                  <div key={entry.id} className="group-item">
                    <strong>{entry.player.name}</strong>
                    <span>{entry.seedPoints} pts</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Todos os jogadores selecionados para o torneio já estão alocados em duplas.</p>
            )}
          </SectionCard>

          <SectionCard title="Duplas cadastradas" description="A força de cada dupla define a distribuição automática dos grupos.">
            {activeTournament.pairs.length ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Dupla</th>
                    <th>Pontuação total</th>
                    <th>Grupo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTournament.pairs.map((pair, index) => {
                    const currentPairPlayerIds = new Set(pair.players.map((player) => player.playerId));

                    return (
                      <tr key={pair.id}>
                        <td>#{index + 1}</td>
                        <td>
                          <PlayerPhotoStack players={pair.players} />
                          <form action={updateTournamentPairAction} className="inline-pair-edit">
                            <input type="hidden" name="pairId" value={pair.id} />
                            {[1, 2].map((slot) => {
                              const currentPlayerId = pair.players.find((player) => player.slot === slot)?.playerId ?? "";
                              const eligibleEntries = allEntries.filter(
                                (entry) => currentPairPlayerIds.has(entry.playerId) || !pairedPlayerIds.has(entry.playerId)
                              );

                              return (
                                <select
                                  key={`${pair.id}-${slot}`}
                                  name={slot === 1 ? "playerAId" : "playerBId"}
                                  defaultValue={currentPlayerId}
                                  aria-label={`Jogador ${slot} da dupla ${index + 1}`}
                                  required
                                >
                                  <option value="">Selecione</option>
                                  {eligibleEntries.map((entry) => (
                                    <option key={`${pair.id}-${slot}-${entry.playerId}`} value={entry.playerId}>
                                      {entry.player.name} ({entry.seedPoints} pts)
                                    </option>
                                  ))}
                                </select>
                              );
                            })}
                            <SubmitButton label="Salvar" pendingLabel="Salvando..." className="button" />
                          </form>
                        </td>
                        <td>{pair.totalPoints}</td>
                        <td>{pair.group?.name ?? "A definir"}</td>
                        <td>
                          <SafeActionForm
                            action={deleteTournamentPairAction}
                            confirmKeyword="EXCLUIR"
                            confirmPrompt="Digite EXCLUIR para remover esta dupla."
                            successMessage="Dupla excluida."
                          >
                            <input type="hidden" name="pairId" value={pair.id} />
                            <SubmitButton label="Excluir" pendingLabel="Excluindo..." className="button" />
                          </SafeActionForm>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="muted">Nenhuma dupla foi cadastrada ainda.</p>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
