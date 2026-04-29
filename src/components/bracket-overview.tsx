type BracketGroup = {
  id: string;
  name: string;
  pairs: {
    id: string;
    name: string;
    totalPoints: number;
  }[];
};

type BracketMatch = {
  id: string;
  label: string;
  stage: string;
  homeScore?: number | null;
  awayScore?: number | null;
  winnerPair?: {
    name: string;
  } | null;
  homePair?: {
    name: string;
  } | null;
  awayPair?: {
    name: string;
  } | null;
};

type BracketOverviewProps = {
  groupCount: number;
  groups: BracketGroup[];
  matches: BracketMatch[];
};

function getKnockoutSize(groupCount: number, pairCount: number) {
  if (pairCount < 4) {
    return 2;
  }

  if (groupCount <= 2) {
    return 4;
  }

  if (pairCount >= 8) {
    return 8;
  }

  return 4;
}

function createStagePlaceholders(groupCount: number, pairCount: number) {
  const knockoutSize = getKnockoutSize(groupCount, pairCount);
  const quarterfinals =
    knockoutSize === 8
      ? ["QF 1 - 1º geral x 8º geral", "QF 2 - 4º geral x 5º geral", "QF 3 - 3º geral x 6º geral", "QF 4 - 2º geral x 7º geral"]
      : [];

  const semifinals =
    knockoutSize >= 4
      ? knockoutSize === 8
        ? ["SF 1 - Vencedor QF1 x Vencedor QF2", "SF 2 - Vencedor QF3 x Vencedor QF4"]
        : ["SF 1 - 1º geral x 4º geral", "SF 2 - 2º geral x 3º geral"]
      : [];

  const final = ["Final"];

  return {
    quarterfinals,
    semifinals,
    final
  };
}

function groupMatchesByStage(matches: BracketMatch[]) {
  return {
    quarterfinals: matches.filter((match) => match.stage === "QUARTERFINAL"),
    semifinals: matches.filter((match) => match.stage === "SEMIFINAL"),
    final: matches.filter((match) => match.stage === "FINAL")
  };
}

export function BracketOverview({ groupCount, groups, matches }: BracketOverviewProps) {
  const pairCount = groups.reduce((total, group) => total + group.pairs.length, 0);
  const placeholders = createStagePlaceholders(groupCount, pairCount);
  const stageMatches = groupMatchesByStage(matches);

  const quarterfinals =
    stageMatches.quarterfinals.length > 0
      ? stageMatches.quarterfinals.map((match) => ({
          id: match.id,
          title: match.label,
          lines: [match.homePair?.name ?? "A definir", match.awayPair?.name ?? "A definir"],
          scores: [match.homeScore ?? null, match.awayScore ?? null],
          winner: match.winnerPair?.name ?? null
        }))
      : placeholders.quarterfinals.map((label) => ({
          id: label,
          title: label,
          lines: ["Classificação pendente", "Classificação pendente"],
          scores: [null, null],
          winner: null
        }));

  const semifinals =
    stageMatches.semifinals.length > 0
      ? stageMatches.semifinals.map((match) => ({
          id: match.id,
          title: match.label,
          lines: [match.homePair?.name ?? "A definir", match.awayPair?.name ?? "A definir"],
          scores: [match.homeScore ?? null, match.awayScore ?? null],
          winner: match.winnerPair?.name ?? null
        }))
      : placeholders.semifinals.map((label) => ({
          id: label,
          title: label,
          lines: ["A definir", "A definir"],
          scores: [null, null],
          winner: null
        }));

  const final =
    stageMatches.final.length > 0
      ? stageMatches.final.map((match) => ({
          id: match.id,
          title: match.label,
          lines: [match.homePair?.name ?? "A definir", match.awayPair?.name ?? "A definir"],
          scores: [match.homeScore ?? null, match.awayScore ?? null],
          winner: match.winnerPair?.name ?? null
        }))
      : placeholders.final.map((label) => ({
          id: label,
          title: label,
          lines: ["A definir", "A definir"],
          scores: [null, null],
          winner: null
        }));

  return (
    <div className="bracket-shell">
      <div className="bracket-stage">
        <div className="bracket-stage-head">
          <p className="eyebrow">Fase 1</p>
          <h3>Grupos</h3>
        </div>

        <div className="bracket-column">
          {groups.length ? (
            groups.map((group) => (
              <article key={group.id} className="bracket-card bracket-card-group">
                <div className="bracket-card-head">
                  <strong>{group.name}</strong>
                  <span>{group.pairs.length} duplas</span>
                </div>
                <div className="bracket-card-body">
                  {group.pairs.slice(0, 4).map((pair) => (
                    <span key={pair.id} className="bracket-team bracket-team-ranked">
                      {pair.name}
                    </span>
                  ))}
                  {group.pairs.length > 4 ? (
                    <span className="bracket-meta">+{group.pairs.length - 4} duplas</span>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <article className="bracket-card bracket-card-empty">
              <div className="bracket-card-head">
                <strong>Grupos pendentes</strong>
              </div>
              <div className="bracket-card-body">
                <span className="bracket-meta">Monte as duplas e distribua os grupos para preencher a chave.</span>
              </div>
            </article>
          )}
        </div>
      </div>

      {quarterfinals.length ? (
        <div className="bracket-stage bracket-stage-linked">
          <div className="bracket-stage-head">
            <p className="eyebrow">Fase 2</p>
            <h3>Quartas</h3>
          </div>

          <div className="bracket-column bracket-column-spaced">
            {quarterfinals.map((match) => (
              <article key={match.id} className="bracket-card">
                <div className="bracket-card-head">
                  <strong>{match.title}</strong>
                </div>
                <div className="bracket-card-body">
                  {match.lines.map((line) => (
                    <span key={line} className={`bracket-team${match.winner === line ? " bracket-team-winner" : ""}`}>
                      {line}
                    </span>
                  ))}
                  {match.scores[0] !== null && match.scores[1] !== null ? (
                    <span className="bracket-meta">
                      Placar: {match.scores[0]} x {match.scores[1]}
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {semifinals.length ? (
        <div className="bracket-stage bracket-stage-linked">
          <div className="bracket-stage-head">
            <p className="eyebrow">Fase 3</p>
            <h3>Semis</h3>
          </div>

          <div className="bracket-column bracket-column-centered">
            {semifinals.map((match) => (
              <article key={match.id} className="bracket-card">
                <div className="bracket-card-head">
                  <strong>{match.title}</strong>
                </div>
                <div className="bracket-card-body">
                  {match.lines.map((line) => (
                    <span key={line} className={`bracket-team${match.winner === line ? " bracket-team-winner" : ""}`}>
                      {line}
                    </span>
                  ))}
                  {match.scores[0] !== null && match.scores[1] !== null ? (
                    <span className="bracket-meta">
                      Placar: {match.scores[0]} x {match.scores[1]}
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="bracket-stage bracket-stage-linked">
        <div className="bracket-stage-head">
          <p className="eyebrow">Decisão</p>
          <h3>Final</h3>
        </div>

        <div className="bracket-column bracket-column-final">
          {final.map((match) => (
            <article key={match.id} className="bracket-card bracket-card-final">
              <div className="bracket-card-head">
                <strong>{match.title}</strong>
              </div>
              <div className="bracket-card-body">
                {match.lines.map((line) => (
                  <span key={line} className={`bracket-team${match.winner === line ? " bracket-team-winner" : ""}`}>
                    {line}
                  </span>
                ))}
                {match.scores[0] !== null && match.scores[1] !== null ? (
                  <span className="bracket-meta">
                    Placar: {match.scores[0]} x {match.scores[1]}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
