import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import {
  createRankingProfileAction,
  deleteRankingProfileAction,
  updateRankingProfileAction
} from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { getArenaDashboard } from "@/lib/services/tournament";
import { getRankingProfilesWithLeaderboard } from "@/lib/services/ranking";

const stageOrder = ["CHAMPION", "RUNNER_UP", "SEMIFINAL", "QUARTERFINAL", "PARTICIPATION"] as const;

type RuleMap = Record<(typeof stageOrder)[number], number>;

function buildRuleMap(rules: { stageKey: string; points: number }[]): RuleMap {
  const defaults: RuleMap = {
    CHAMPION: 200,
    RUNNER_UP: 140,
    SEMIFINAL: 90,
    QUARTERFINAL: 50,
    PARTICIPATION: 20
  };

  for (const rule of rules) {
    if (rule.stageKey in defaults) {
      defaults[rule.stageKey as keyof RuleMap] = rule.points;
    }
  }

  return defaults;
}

export default async function TournamentRankingsPage() {
  const auth = await requireModuleView("tournaments");
  const [{ activeTournament, players }, rankings] = await Promise.all([
    getArenaDashboard(auth.arenaId),
    getRankingProfilesWithLeaderboard(auth.arenaId)
  ]);

  const arenaRanking = players.slice(0, 12);
  const tournamentRanking = [...(activeTournament?.entries ?? [])]
    .sort((a, b) => b.tournamentPoints - a.tournamentPoints || b.seedPoints - a.seedPoints || a.player.name.localeCompare(b.player.name))
    .slice(0, 12);

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Campeonatos</p>
          <h1>Rankings</h1>
          <p className="muted">
            Crie rankings com regras próprias de pontuação e escolha, em cada torneio, qual deles será usado na competição.
          </p>
        </div>
      </header>

      <div className="stats-grid">
        <StatCard label="Rankings cadastrados" value={rankings.length} caption="Disponíveis para novos torneios" />
        <StatCard label="Torneio atual" value={activeTournament ? 1 : 0} caption={activeTournament?.name ?? "Nenhum em andamento"} />
        <StatCard label="Ranking ativo no torneio" value={activeTournament?.ranking ? 1 : 0} caption={activeTournament?.ranking?.name ?? "Nenhum vinculado"} />
        <StatCard label="Jogadores ranqueados" value={players.length} caption="Cadastro ativo da arena" />
      </div>

      <SectionCard
        title="Novo ranking"
        description="Cadastre regras diferentes para ligas, rankings internos, temporadas ou formatos especiais."
      >
        <SafeActionForm action={createRankingProfileAction} className="grid-form" resetOnSuccess successMessage="Ranking criado com sucesso.">
          <div className="field">
            <label htmlFor="ranking-name">Nome do ranking</label>
            <input id="ranking-name" name="name" type="text" placeholder="Ex.: Ranking oficial 2026" required />
          </div>
          <div className="field form-full">
            <label htmlFor="ranking-description">Descrição</label>
            <input id="ranking-description" name="description" type="text" placeholder="Use para identificar o formato ou a temporada." />
          </div>

          <div className="field">
            <label htmlFor="championPoints">1º lugar</label>
            <input id="championPoints" name="championPoints" type="number" min="0" defaultValue="200" />
          </div>
          <div className="field">
            <label htmlFor="runnerUpPoints">2º lugar</label>
            <input id="runnerUpPoints" name="runnerUpPoints" type="number" min="0" defaultValue="140" />
          </div>
          <div className="field">
            <label htmlFor="semifinalPoints">Semifinal</label>
            <input id="semifinalPoints" name="semifinalPoints" type="number" min="0" defaultValue="90" />
          </div>
          <div className="field">
            <label htmlFor="quarterfinalPoints">Quartas de final</label>
            <input id="quarterfinalPoints" name="quarterfinalPoints" type="number" min="0" defaultValue="50" />
          </div>
          <div className="field">
            <label htmlFor="participationPoints">Participação</label>
            <input id="participationPoints" name="participationPoints" type="number" min="0" defaultValue="20" />
          </div>

          <div className="form-full">
            <SubmitButton label="Criar ranking" pendingLabel="Criando..." className="button button-primary" />
          </div>
        </SafeActionForm>
      </SectionCard>

      <SectionCard
        title="Rankings cadastrados"
        description="Edite as regras, acompanhe o uso em torneios e remova o que não fizer mais sentido."
      >
        {rankings.length ? (
          <div className="manual-upcoming-list">
            {rankings.map((ranking) => {
              const ruleMap = buildRuleMap(ranking.rules);

              return (
                <div key={ranking.id} className="card stack-md">
                  <SafeActionForm action={updateRankingProfileAction} className="grid-form" successMessage="Ranking atualizado com sucesso.">
                    <input type="hidden" name="rankingId" value={ranking.id} />

                    <div className="field">
                      <label htmlFor={`${ranking.id}-name`}>Nome do ranking</label>
                      <input id={`${ranking.id}-name`} name="name" type="text" defaultValue={ranking.name} required />
                    </div>
                    <div className="field form-full">
                      <label htmlFor={`${ranking.id}-description`}>Descrição</label>
                      <input id={`${ranking.id}-description`} name="description" type="text" defaultValue={ranking.description} />
                    </div>

                    <div className="field">
                      <label htmlFor={`${ranking.id}-champion`}>1º lugar</label>
                      <input id={`${ranking.id}-champion`} name="championPoints" type="number" min="0" defaultValue={ruleMap.CHAMPION} />
                    </div>
                    <div className="field">
                      <label htmlFor={`${ranking.id}-runner`}>2º lugar</label>
                      <input id={`${ranking.id}-runner`} name="runnerUpPoints" type="number" min="0" defaultValue={ruleMap.RUNNER_UP} />
                    </div>
                    <div className="field">
                      <label htmlFor={`${ranking.id}-semi`}>Semifinal</label>
                      <input id={`${ranking.id}-semi`} name="semifinalPoints" type="number" min="0" defaultValue={ruleMap.SEMIFINAL} />
                    </div>
                    <div className="field">
                      <label htmlFor={`${ranking.id}-quarter`}>Quartas de final</label>
                      <input id={`${ranking.id}-quarter`} name="quarterfinalPoints" type="number" min="0" defaultValue={ruleMap.QUARTERFINAL} />
                    </div>
                    <div className="field">
                      <label htmlFor={`${ranking.id}-participation`}>Participação</label>
                      <input id={`${ranking.id}-participation`} name="participationPoints" type="number" min="0" defaultValue={ruleMap.PARTICIPATION} />
                    </div>

                    <div className="form-full simple-list">
                      <div className="simple-item">
                        <strong>Uso no período atual</strong>
                        <span>{ranking.tournaments.length ? ranking.tournaments.map((tournament) => tournament.name).join(", ") : "Nenhum torneio neste ciclo usando este ranking"}</span>
                      </div>
                      <div className="simple-item">
                        <strong>Total de torneios vinculados</strong>
                        <span>{ranking._count.tournaments}</span>
                      </div>
                      <div className="simple-item">
                        <strong>Classificacao do ranking</strong>
                        <span>{ranking.linkedPlayers ? `${ranking.linkedPlayers} jogadores vinculados` : "Nenhum jogador vinculado ainda"}</span>
                      </div>
                      {ranking.leaderboard.length ? (
                        <div className="form-full stack-sm">
                          <strong>Preview da classificacao</strong>
                          <div className="tv-ranking-preview">
                            {ranking.leaderboard.slice(0, 5).map((entry, index) => (
                              <div className="tv-ranking-preview-row" key={entry.playerId}>
                                <strong>#{index + 1}</strong>
                                <span>{entry.playerName}</span>
                                <small>{entry.points} pts · {entry.tournamentsPlayed} torneios</small>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="form-full">
                          <p className="muted">
                            Ainda nao ha jogadores pontuados neste ranking. O vinculo acontece pelos torneios que selecionam este ranking.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="form-full section-actions">
                      <Link href={`/torneios/rankings/${ranking.id}`} className="button">
                        Ver classificacao completa
                      </Link>
                      <SubmitButton label="Salvar ranking" pendingLabel="Salvando..." className="button button-primary" />
                    </div>
                  </SafeActionForm>

                  <SafeActionForm
                    action={deleteRankingProfileAction}
                    confirmKeyword="EXCLUIR"
                    confirmPrompt="Digite EXCLUIR para remover este ranking."
                    successMessage="Ranking excluido."
                  >
                    <input type="hidden" name="rankingId" value={ranking.id} />
                    <SubmitButton label="Remover ranking" pendingLabel="Removendo..." className="button button-danger" />
                  </SafeActionForm>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted">Nenhum ranking cadastrado ainda.</p>
        )}
      </SectionCard>

      <div className="two-column-grid">
        <SectionCard
          title="Ranking do torneio atual"
          description={activeTournament ? `Pontuação dos inscritos em ${activeTournament.name}.` : "Crie um torneio para acompanhar o ranking específico da edição."}
        >
          {tournamentRanking.length ? (
            <div className="tv-ranking-preview">
              {tournamentRanking.map((entry, index) => (
                <div className="tv-ranking-preview-row" key={entry.id}>
                  <strong>#{index + 1}</strong>
                  <span>{entry.player.name}</span>
                  <small>{entry.tournamentPoints} pts</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Ainda não há pontuação registrada para o torneio atual.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Ranking geral da arena"
          description="Classificação acumulada dos jogadores ativos da arena."
        >
          {arenaRanking.length ? (
            <div className="tv-ranking-preview">
              {arenaRanking.map((player, index) => (
                <div className="tv-ranking-preview-row" key={player.id}>
                  <strong>#{index + 1}</strong>
                  <span>{player.name}</span>
                  <small>{player.points} pts</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Nenhum jogador ativo no ranking geral.</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
