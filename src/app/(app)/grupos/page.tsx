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

function getOverallStandings(groups: Array<{ name: string; pairs: GroupPair[] }>, matches: GroupMatch[]) {
  const pairs = groups.flatMap((group) => group.pairs);
  const groupByPairId = new Map(
    groups.flatMap((group) => group.pairs.map((pair) => [pair.id, group.name] as const))
  );
  const standings = getGroupStandings(pairs, matches);

  return standings.map((item) => ({
    ...item,
    groupName: groupByPairId.get(item.pairId) ?? "-"
  }));
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

  const overallStandings =
    activeTournament?.groupCount === 3
      ? getOverallStandings(
          activeTournament.groups,
          activeTournament.matches.filter((match) => match.stage === "GROUP")
        )
      : [];

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Grupos</p>
          <h1>Organizacao dos grupos</h1>
          <p className="muted">
            Distribua as duplas por forca e, quando precisar, arraste manualmente uma dupla de um grupo para outro.
          </p>
        </div>
      </header>

      {!activeTournament ? (
        <SectionCard title="Nenhum torneio em andamento">
          <p className="muted">Crie um torneio e monte as duplas para comecar a organizar os grupos.</p>
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title={isRoundRobinOnly ? "Montar todos contra todos" : "Montar grupos"}
            description={
              isRoundRobinOnly
                ? "Este torneio tera um grupo unico. Todas as duplas jogam entre si, e a classificacao e baseada nos resultados."
                : `Este torneio tera ate ${activeTournament.groupCount} grupos, usando ${activeTournament.pairsPerGroup} duplas como base. Sobras podem deixar alguns grupos maiores.`
            }
          >
            <div className="stack-sm">
              {activeTournament.registrationPhase === "REGISTRATIONS" ? (
                <div className="form-hint-box">
                  <strong>Montagem bloqueada durante inscrições</strong>
                  <p className="muted">
                    Encerre as inscrições no torneio para liberar a definição do formato e a montagem dos grupos.
                  </p>
                </div>
              ) : (
                <form action={generateGroupsAction}>
                  <input type="hidden" name="tournamentId" value={activeTournament.id} />
                  <SubmitButton label="Distribuir duplas" pendingLabel="Distribuindo..." className="button button-primary" />
                </form>
              )}
              <div className="form-hint-box">
                <strong>Ajuste manual liberado</strong>
                <p className="muted">
                  Voce pode arrastar uma dupla entre os grupos abaixo. Quando isso acontece, os jogos atuais do torneio sao limpos para voce regenerar a tabela com a nova organizacao.
                </p>
              </div>
            </div>
          </SectionCard>

          {groups.length ? (
            <GroupEditor groups={groups} />
          ) : (
            <SectionCard title="Grupos ainda nao montados">
              <p className="muted">Assim que as duplas forem distribuidas, os grupos aparecerao aqui.</p>
            </SectionCard>
          )}

          {overallStandings.length ? (
            <SectionCard
              title="Ranking geral da fase de grupos"
              description="Classificacao final considerando os resultados dos 3 grupos."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pos.</th>
                    <th>Dupla</th>
                    <th>Grupo</th>
                    <th>Vitorias</th>
                    <th>Games pro</th>
                    <th>Games contra</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {overallStandings.map((item, index) => {
                    const balance = item.gamesFor - item.gamesAgainst;
                    return (
                      <tr key={item.pairId}>
                        <td>#{index + 1}</td>
                        <td>{item.pairName}</td>
                        <td>{item.groupName}</td>
                        <td>{item.wins}</td>
                        <td>{item.gamesFor}</td>
                        <td>{item.gamesAgainst}</td>
                        <td>{balance}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </SectionCard>
          ) : null}
        </>
      )}
    </div>
  );
}
