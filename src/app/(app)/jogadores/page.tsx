import { LiveQueryInput } from "@/components/forms/live-query-input";
import { AthleteCreatePanel } from "@/components/players/athlete-create-panel";
import { PlayerActionsCell } from "@/components/players/player-actions-cell";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { getAthleteDeletionRestriction } from "@/lib/athlete-management";
import { canEditModule } from "@/lib/permissions";
import { getArenaDashboard } from "@/lib/services/tournament";

type PlayersPageProps = {
  searchParams?: {
    q?: string;
  };
};

export default async function PlayersPage({ searchParams }: PlayersPageProps) {
  const auth = await requireModuleView("players");
  const { players } = await getArenaDashboard(auth.arenaId);
  const query = (searchParams?.q ?? "").trim().toLowerCase();
  const canManageAthletes = canEditModule("players", auth.arenaRole, auth.systemRole, auth.editPermissions);

  const sortedPlayers = [...players].sort((a, b) => {
    const aHit = query ? a.name.toLowerCase().includes(query) : true;
    const bHit = query ? b.name.toLowerCase().includes(query) : true;
    if (aHit !== bHit) return aHit ? -1 : 1;
    return b.points - a.points;
  });

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Gestão</p>
          <h1>Atletas</h1>
          <p className="muted">Consulte os atletas cadastrados, filtre a lista e gerencie cada registro quando tiver permissão.</p>
        </div>
        {canManageAthletes ? <AthleteCreatePanel /> : null}
      </header>

      <SectionCard title="Atletas cadastrados" description="Digite para trazer o atleta para o topo da lista.">
        <div className="inline-form" style={{ marginBottom: "0.75rem" }}>
          <LiveQueryInput
            name="q"
            defaultValue={searchParams?.q ?? ""}
            placeholder="Pesquisar atleta por nome"
            ariaLabel="Pesquisar atleta"
          />
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Atleta</th>
              <th>Pontos</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, index) => (
              <tr key={player.id}>
                <td>#{index + 1}</td>
                <td>
                  {canManageAthletes ? (
                    <PlayerActionsCell
                      playerId={player.id}
                      playerName={player.name}
                      playerPoints={player.points}
                      playerPhotoUrl={player.photoUrl}
                      active={player.active}
                      deletionRestriction={getAthleteDeletionRestriction({
                        tournamentEntries: player._count.entries,
                        pairAppearances: player._count.pairPlayers
                      })}
                    />
                  ) : (
                    <div className="player-name-cell">
                      <span className="player-avatar" aria-hidden="true">
                        {player.photoUrl ? <img src={player.photoUrl} alt="" /> : player.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="player-name-label">{player.name}</span>
                    </div>
                  )}
                </td>
                <td>{player.points}</td>
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
