import { SubmitButton } from "@/components/forms/submit-button";
import { GroupEditor } from "@/components/group-editor";
import { SectionCard } from "@/components/section-card";
import { generateGroupsAction } from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { getArenaDashboard } from "@/lib/services/tournament";

function formatScore(homeScore: number | null, awayScore: number | null) {
  return homeScore !== null && awayScore !== null ? `${homeScore} x ${awayScore}` : "Pendente";
}

type GroupPair = NonNullable<Awaited<ReturnType<typeof getArenaDashboard>>["activeTournament"]>["groups"][number]["pairs"][number];
type GroupMatch = NonNullable<Awaited<ReturnType<typeof getArenaDashboard>>["activeTournament"]>["matches"][number];

function getGroupStandings(pairs: GroupPair[], matches: GroupMatch[]) {
  const standings = new Map(
    pairs.map((pair) => [
      pair.id,
      {
        pairId: pair.id,
        pairName: pair.name,
        totalPoints: pair.totalPoints,
        wins: 0,
        gamesFor: 0,
        gamesAgainst: 0
      }
    ])
  );

  for (const match of matches) {
    if (match.homeScore === null || match.awayScore === null || !match.homePairId || !match.awayPairId) {
      continue;
    }

    const homeStats = standings.get(match.homePairId);
    const awayStats = standings.get(match.awayPairId);

    if (!homeStats || !awayStats) {
      continue;
    }

    homeStats.gamesFor += match.homeScore;
    homeStats.gamesAgainst += match.awayScore;
    awayStats.gamesFor += match.awayScore;
    awayStats.gamesAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      homeStats.wins += 1;
    } else {
      awayStats.wins += 1;
    }
  }

  return [...standings.values()].sort((a, b) => {
    const aBalance = a.gamesFor - a.gamesAgainst;
    const bBalance = b.gamesFor - b.gamesAgainst;

    if (b.wins !== a.wins) return b.wins - a.wins;
    if (bBalance !== aBalance) return bBalance - aBalance;
    if (b.gamesFor !== a.gamesFor) return b.gamesFor - a.gamesFor;
    return b.totalPoints - a.totalPoints;
  });
}

export default async function GroupsPage() {
  const auth = await requireModuleView("groups");
  const { activeTournament } = await getArenaDashboard(auth.arenaId);
  const isRoundRobinOnly = activeTournament?.groupCount === 1;

  const groups =
    activeTournament?.groups.map((group) => {
      const groupMatches = activeTournament.matches.filter((match) => match.groupId === group.id);
      const standings = getGroupStandings(group.pairs, groupMatches);

      return {
        id: group.id,
        name: group.name,
        pairs: standings.map((standing) => ({
          id: standing.pairId,
          name: standing.pairName,
          totalPoints: standing.totalPoints,
          wins: standing.wins,
          gamesFor: standing.gamesFor,
          gamesAgainst: standing.gamesAgainst
        })),
        matches: groupMatches.map((match) => ({
          id: match.id,
          homePairName: match.homePair?.name ?? "A definir",
          awayPairName: match.awayPair?.name ?? "A definir",
          scoreLabel: formatScore(match.homeScore, match.awayScore)
        }))
      };
    }) ?? [];

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Grupos</p>
          <h1>Organização dos grupos</h1>
          <p className="muted">
            Distribua as duplas por força e, quando precisar, arraste manualmente uma dupla de um grupo para outro.
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
            title={isRoundRobinOnly ? "Montar todos contra todos" : "Montar grupos"}
            description={
              isRoundRobinOnly
                ? "Este torneio terá um grupo único. Todas as duplas jogam entre si, e a classificação é baseada nos resultados."
                : `Este torneio terá até ${activeTournament.groupCount} grupos, usando ${activeTournament.pairsPerGroup} duplas como base. Sobras podem deixar alguns grupos maiores.`
            }
          >
            <div className="stack-sm">
              <form action={generateGroupsAction}>
                <input type="hidden" name="tournamentId" value={activeTournament.id} />
                <SubmitButton label="Distribuir duplas" pendingLabel="Distribuindo..." className="button button-primary" />
              </form>
              <div className="form-hint-box">
                <strong>Ajuste manual liberado</strong>
                <p className="muted">
                  Você pode arrastar uma dupla entre os grupos abaixo. Quando isso acontece, os jogos atuais do torneio são limpos para você regenerar a tabela com a nova organização.
                </p>
              </div>
            </div>
          </SectionCard>

          {groups.length ? (
            <GroupEditor groups={groups} />
          ) : (
            <SectionCard title="Grupos ainda não montados">
              <p className="muted">Assim que as duplas forem distribuídas, os grupos aparecerão aqui.</p>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
