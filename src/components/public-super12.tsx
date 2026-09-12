import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { finishSuper12Action, recordSuper12ScoreAction } from "@/lib/actions/public-super12";
import { PublicSuper12Create } from "@/components/public-super12-create";

type Super12Data = Awaited<ReturnType<typeof import("@/lib/services/public-super12").getPublicSuper12>>;
type StandingRow = { pairId: string; name: string; played: number; wins: number; pointsFor: number; pointsAgainst: number; points: number };

function super12Href(eventId?: string) {
  const query = new URLSearchParams({ section: "leagues", eventTab: "super12" });
  if (eventId) query.set("super12", eventId);
  return `?${query.toString()}`;
}

export function PublicSuper12({ arenaSlug, data }: { arenaSlug: string; data: Super12Data }) {
  if (!data) return null;
  const event = data.selectedEvent;
  const boardGroups = event ? event.groups.map((group) => ({
    ...group,
    rows: event.standings.find((standing) => standing.id === group.id)?.rows ?? [] as StandingRow[],
  })) : [];
  return <section className="athlete-portal-content-panel super12-panel">
    <PublicSuper12Create arenaSlug={arenaSlug} athletes={data.availablePlayers} />
    {data.events.length ? <section className="super12-event-list" aria-label="Super 12 em andamento"><strong>Rodadas em andamento</strong><div>{data.events.map((item) => <Link key={item.id} href={super12Href(item.id)} className={event?.id === item.id ? "active" : ""}><b>{item.name}</b><span>{item.format === "GROUPS" ? "Grupos" : "Todos contra todos"} · {item._count.pairs} duplas · {item._count.matches} jogos</span></Link>)}</div></section> : null}
    {event?.status === "FINISHED" ? <section className="super12-finished"><span aria-hidden="true">🏆</span><div><strong>Rodada encerrada</strong><p>{event.name} foi concluído e saiu das rodadas em andamento. Os jogos e placares ficam recolhidos para manter o Portal leve.</p></div><Link href={super12Href()} className="button button-small">Voltar ao Super 12</Link></section> : event ? <section className="super12-board">
      <header><div><span>{event.format === "GROUPS" ? "FORMATO: GRUPOS" : "FORMATO: TODOS CONTRA TODOS"}</span><h3>{event.name}</h3><p>Organizado por {event.creator.name} · {boardGroups.reduce((total, group) => total + group.pairs.length, 0)} duplas.</p></div>{event.isCreator ? <SafeActionForm action={finishSuper12Action} successMessage="Super 12 concluído. Ele não aparecerá na lista de rodadas em andamento." confirmKeyword="ENCERRAR" confirmPrompt="A rodada será encerrada e os jogos deixarão de aparecer na tela."><p className="super12-finish-keyword">Para confirmar, digite <strong>ENCERRAR</strong> no campo abaixo.</p><input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="eventId" value={event.id} /><SubmitButton label="Concluir rodada" pendingLabel="Concluindo..." className="button button-small" /></SafeActionForm> : null}</header>
      {boardGroups.map((group) => <section className="super12-group" key={group.id}><h4>{group.name}</h4><div className="super12-group-layout"><div className="super12-matches"><strong>Jogos</strong>{group.matches.map((match) => <article key={match.id}><div><b>{match.homePair.name}</b><span>×</span><b>{match.awayPair.name}</b></div>{event.isCreator && event.status === "ACTIVE" ? <SafeActionForm action={recordSuper12ScoreAction} successMessage="Placar atualizado."><input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="matchId" value={match.id} /><label aria-label={`Placar de ${match.homePair.name}`}><input name="homeScore" type="number" min="0" max="99" required defaultValue={match.homeScore ?? ""} /></label><span>×</span><label aria-label={`Placar de ${match.awayPair.name}`}><input name="awayScore" type="number" min="0" max="99" required defaultValue={match.awayScore ?? ""} /></label><SubmitButton label="Salvar" pendingLabel="..." className="button button-small" /></SafeActionForm> : <em>{match.homeScore == null || match.awayScore == null ? "A definir" : `${match.homeScore} × ${match.awayScore}`}</em>}</article>)}</div><div className="super12-standing"><strong>Classificação</strong><table><thead><tr><th>#</th><th>Dupla</th><th>J</th><th>V</th><th>SG</th><th>Pts</th></tr></thead><tbody>{group.rows.map((row, index) => <tr key={row.pairId}><td>{index + 1}</td><td>{row.name}</td><td>{row.played}</td><td>{row.wins}</td><td>{row.pointsFor - row.pointsAgainst}</td><td><b>{row.points}</b></td></tr>)}</tbody></table><small>3 pontos por vitória. Desempate: vitórias, saldo e pontos pró.</small></div></div></section>)}
    </section> : <section className="super12-empty"><strong>Nenhum Super 12 em andamento</strong><p>Escolha de 2 a 12 duplas para começar uma rodada.</p></section>}
  </section>;
}
