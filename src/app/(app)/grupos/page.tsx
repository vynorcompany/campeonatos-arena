import { SectionCard } from "@/components/section-card";
import { SubmitButton } from "@/components/forms/submit-button";
import { generateGroupsAction } from "@/lib/actions/tournament";
import { requireArenaAccess } from "@/lib/auth/session";
import { getArenaDashboard } from "@/lib/services/tournament";

export default async function GroupsPage() {
  const auth = await requireArenaAccess();
  const { activeTournament } = await getArenaDashboard(auth.arenaId);

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Grupos</p>
          <h1>Organização dos grupos</h1>
          <p className="muted">
            Distribua as duplas por força e acompanhe como a competição foi montada.
          </p>
        </div>
      </header>

      {!activeTournament ? (
        <SectionCard title="Nenhum torneio em andamento">
          <p className="muted">Crie um torneio e monte as duplas para começar a organizar os grupos.</p>
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title="Montar grupos"
            description={`Este torneio terá até ${activeTournament.groupCount} grupos com até ${activeTournament.pairsPerGroup} duplas em cada grupo.`}
          >
            <form action={generateGroupsAction}>
              <input type="hidden" name="tournamentId" value={activeTournament.id} />
              <SubmitButton label="Distribuir duplas" pendingLabel="Distribuindo..." className="button button-primary" />
            </form>
          </SectionCard>

          <div className="group-grid">
            {activeTournament.groups.length ? (
              activeTournament.groups.map((group) => (
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
              ))
            ) : (
              <SectionCard title="Grupos ainda não montados">
                <p className="muted">Assim que as duplas forem distribuídas, os grupos aparecerão aqui.</p>
              </SectionCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}
