"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { recordCategoryTrioGameAction } from "@/lib/actions/category-trio";
import { tournamentWorkspace as ui } from "./tournament-workspace";

type Athlete = { id: string; name: string };
export type TrioGame = { id: string; gameNumber: number; homePlayerIds: string[]; awayPlayerIds: string[]; homeScore: number | null; awayScore: number | null };
export type TrioSide = { name: string; players: { player: Athlete }[] };
const formationKey = (ids: string[]) => [...ids].sort().join("|");
const completed = (game: TrioGame) => game.homeScore != null && game.awayScore != null;

function Formation({ name, team, selected, onChange, disabled }: { name: string; team: TrioSide; selected: string[]; onChange: (ids: string[]) => void; disabled: boolean }) {
  return <fieldset className="tw:m-0 tw:grid tw:min-w-0 tw:gap-1 tw:border-0 tw:p-0" disabled={disabled}>
    <legend className="tw:mb-1 tw:max-w-full tw:break-words tw:text-xs tw:font-medium">{team.name} · {selected.length}/2</legend>
    {team.players.map(({ player }) => <label key={player.id} className="tw:flex tw:min-w-0 tw:items-start tw:gap-2 tw:py-1 tw:text-xs"><input className="tw:mt-0.5 tw:shrink-0" type="checkbox" name={name} value={player.id} checked={selected.includes(player.id)} disabled={!selected.includes(player.id) && selected.length >= 2} onChange={event => onChange(event.target.checked ? [...selected, player.id] : selected.filter(id => id !== player.id))}/><span className="tw:min-w-0 tw:break-words">{player.name}</span></label>)}
  </fieldset>;
}

function TrioGameForm({ matchId, number, game, games, home, away, editable }: { matchId: string; number: number; game?: TrioGame; games: TrioGame[]; home: TrioSide; away: TrioSide; editable: boolean }) {
  const [state, action, pending] = useActionState(recordCategoryTrioGameAction, {} as { error?: string; success?: boolean });
  const [homeIds, setHomeIds] = useState(game?.homePlayerIds ?? []);
  const [awayIds, setAwayIds] = useState(game?.awayPlayerIds ?? []);
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [state, router]);
  const repeated = games.some(other => other.gameNumber !== number && ((homeIds.length === 2 && formationKey(other.homePlayerIds) === formationKey(homeIds)) || (awayIds.length === 2 && formationKey(other.awayPlayerIds) === formationKey(awayIds))));
  return <form action={action} className="tw:grid tw:min-w-0 tw:gap-3 tw:border-t tw:border-[var(--line)] tw:py-3">
    <input type="hidden" name="matchId" value={matchId}/><input type="hidden" name="gameNumber" value={number}/>
    <strong className="tw:text-xs tw:font-medium">{number === 1 ? "Ida" : number === 2 ? "Volta" : "Desempate"}</strong>
    <div className="tw:grid tw:min-w-0 tw:grid-cols-2 tw:gap-3 tw:max-[560px]:grid-cols-1">
      <Formation name="homePlayerIds" team={home} selected={homeIds} onChange={setHomeIds} disabled={!editable || pending}/>
      <Formation name="awayPlayerIds" team={away} selected={awayIds} onChange={setAwayIds} disabled={!editable || pending}/>
    </div>
    {editable ? <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-end tw:gap-2">
      <label className={`${ui.field} tw:w-[120px]`}>Games · casa<input name="homeScore" aria-label={`Games de ${home.name} na ${number === 1 ? "ida" : number === 2 ? "volta" : "desempate"}`} type="number" min="0" step="1" required defaultValue={game?.homeScore ?? ""}/></label>
      <label className={`${ui.field} tw:w-[120px]`}>Games · visitante<input name="awayScore" aria-label={`Games de ${away.name} na ${number === 1 ? "ida" : number === 2 ? "volta" : "desempate"}`} type="number" min="0" step="1" required defaultValue={game?.awayScore ?? ""}/></label>
      <button type="submit" className={ui.success} disabled={pending || homeIds.length !== 2 || awayIds.length !== 2 || repeated}>{pending ? "Salvando..." : "Salvar jogo"}</button>
    </div> : <p className="tw:m-0 tw:text-sm">{game?.homeScore ?? "–"} × {game?.awayScore ?? "–"}</p>}
    {repeated ? <p role="alert" className="tw:m-0 tw:text-xs tw:text-[#a02119]">Cada equipe deve usar uma formação diferente em cada jogo deste confronto.</p> : null}
    {state.error ? <p role="alert" className="tw:m-0 tw:text-xs tw:text-[#a02119]">{state.error}</p> : null}
    {state.success ? <p role="status" className="tw:m-0 tw:text-xs tw:text-[#065f46]">Jogo salvo.</p> : null}
  </form>;
}

export function CategoryTrioMatchPanel({ matchId, games, home, away, canRecordResults }: { matchId: string; games: TrioGame[]; home: TrioSide; away: TrioSide; canRecordResults: boolean }) {
  const firstTwo = games.filter(game => game.gameNumber <= 2 && completed(game));
  const homeWins = firstTwo.filter(game => game.homeScore! > game.awayScore!).length;
  const thirdNeeded = firstTwo.length === 2 && homeWins === 1;
  return <details className="tw:col-span-full tw:min-w-0 tw:border-t tw:border-[var(--line)] tw:pt-2"><summary className="tw:cursor-pointer tw:text-xs tw:font-medium tw:text-[#174983]">Jogos do confronto · ida e volta{thirdNeeded ? " + desempate" : ""}</summary>
    <p className="tw:my-2 tw:text-xs tw:text-[#465c75]">Selecione dois atletas de cada trio por jogo, sem repetir a formação neste confronto. Em outro confronto, todas as formações ficam disponíveis novamente.</p>
    {[1, 2, ...(thirdNeeded || games.some(game => game.gameNumber === 3) ? [3] : [])].map(number => <TrioGameForm key={`${matchId}-${number}`} matchId={matchId} number={number} game={games.find(game => game.gameNumber === number)} games={games} home={home} away={away} editable={canRecordResults && (number !== 3 || thirdNeeded)}/>)}
    {!thirdNeeded && !games.some(game => game.gameNumber === 3) ? <p className="tw:m-0 tw:text-xs tw:text-[#465c75]">O desempate será liberado se a ida e a volta terminarem em 1 × 1.</p> : null}
  </details>;
}
