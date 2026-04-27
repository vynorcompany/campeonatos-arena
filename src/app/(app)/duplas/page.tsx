import Link from "next/link";
import { ManualPairForm } from "@/components/forms/manual-pair-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { deleteTournamentPairAction } from "@/lib/actions/tournament";
import { requireArenaAccess } from "@/lib/auth/session";
import { getArenaDashboard } from "@/lib/services/tournament";

export default async function PairsPage() {
  const auth = await requireArenaAccess();
  const { activeTournament } = await getArenaDashboard(auth.arenaId);
  const pairedPlayerIds = new Set(
    activeTournament?.pairs.flatMap((pair) => pair.players.map((player) => player.playerId)) ?? []
  );
  const availableEntries =
    activeTournament?.entries.filter((entry) => !pairedPlayerIds.has(entry.playerId)) ?? [];

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
              <Link href="/jogadores" className="button">
                Escolher participantes
              </Link>
            </div>

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
                  {activeTournament.pairs.map((pair, index) => (
                    <tr key={pair.id}>
                      <td>#{index + 1}</td>
                      <td>{pair.name}</td>
                      <td>{pair.totalPoints}</td>
                      <td>{pair.group?.name ?? "A definir"}</td>
                      <td>
                        <form action={deleteTournamentPairAction}>
                          <input type="hidden" name="pairId" value={pair.id} />
                          <SubmitButton label="Excluir" pendingLabel="Excluindo..." className="button" />
                        </form>
                      </td>
                    </tr>
                  ))}
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
