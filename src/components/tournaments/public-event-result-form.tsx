"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SmartEntitySelect } from "@/components/forms/smart-entity-select";
import { recordOwnEventMatchResultAction, recordOwnTrioGameResultAction } from "@/lib/actions/public-event-results";

type Player = { id: string; name: string };
type TrioGame = { gameNumber: number; homePlayerIds: string[]; awayPlayerIds: string[]; homeScore: number | null; awayScore: number | null };
const field = "tw:min-h-10 tw:w-full tw:min-w-0 tw:rounded-md tw:border tw:border-[#718bac] tw:bg-[var(--portal-surface,#fff)] tw:px-3 tw:py-2 tw:text-sm tw:text-[var(--portal-ink,#172d4c)] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#205da8] tw:dark:focus-visible:outline-[#a5caff]";
const gameLabels = ["Ida", "Volta", "Desempate"];

export function PublicEventResultForm({ arenaSlug, matchId, homeName, awayName, isTrio, homePlayers, awayPlayers, trioGames, onSaved }: {
  arenaSlug: string; matchId: string; homeName: string; awayName: string; isTrio: boolean;
  homePlayers: Player[]; awayPlayers: Player[]; trioGames: TrioGame[];
  onSaved: (message: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);
  const [homeFormation, setHomeFormation] = useState(["", ""]);
  const [awayFormation, setAwayFormation] = useState(["", ""]);
  const completed = trioGames.filter(game => game.homeScore != null && game.awayScore != null);
  const gameNumber = [1, 2, 3].find(number => !completed.some(game => game.gameNumber === number)) ?? 3;
  const formation = (name: string, players: Player[], values: string[], setValues: (value: string[]) => void, inputName: string) => <fieldset className="tw:m-0 tw:grid tw:min-w-0 tw:gap-2 tw:border-0 tw:p-0"><legend className="tw:mb-2 tw:break-words tw:text-xs tw:font-medium">{name}</legend>{[0, 1].map(index => <SmartEntitySelect key={index} label={`${name} · Atleta ${index + 1}`} name={inputName} value={values[index]} required disabled={pending} onChange={event => setValues(values.map((value, slot) => slot === index ? event.target.value : value))}><option value="">Atleta {index + 1}</option>{players.filter(player => player.id !== values[1 - index]).map(player => <option key={player.id} value={player.id}>{player.name}</option>)}</SmartEntitySelect>)}</fieldset>;
  return <form className="tw:grid tw:min-w-0 tw:gap-3 tw:pt-3 tw:[&_input]:placeholder:text-[#606874] tw:dark:[&_input]:placeholder:text-[#aab4c2]" onSubmit={event => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setFeedback(null);
    startTransition(async () => {
      try {
        const saved = await (isTrio ? recordOwnTrioGameResultAction(data) : recordOwnEventMatchResultAction(data));
        if (!saved.success) { setFeedback({ success: false, text: saved.error }); return; }
        if (saved.matchId !== matchId || typeof saved.homeScore !== "number" || typeof saved.awayScore !== "number") throw new Error("Não foi possível confirmar a gravação. Tente novamente.");
        const text = isTrio ? `Jogo ${gameNumber} salvo. Placar do confronto: ${saved.homeScore} × ${saved.awayScore}.` : `Resultado salvo: ${homeName} ${saved.homeScore} × ${saved.awayScore} ${awayName}.`;
        setFeedback({ success: true, text }); onSaved(text); router.refresh();
      } catch {
        setFeedback({ success: false, text: "Não foi possível salvar o resultado. Seus valores continuam aqui; tente novamente ou avise a arena." });
      }
    });
  }}>
    <input type="hidden" name="arenaSlug" value={arenaSlug}/><input type="hidden" name="matchId" value={matchId}/>
    {isTrio ? <><input type="hidden" name="gameNumber" value={gameNumber}/><span className="tw:text-xs tw:font-medium">{gameLabels[gameNumber - 1]} · Jogo {gameNumber}</span>{completed.length ? <div className="tw:flex tw:flex-wrap tw:gap-x-4 tw:gap-y-1 tw:text-xs tw:text-[var(--portal-muted)]">{completed.map(game => <span key={game.gameNumber}>{gameLabels[game.gameNumber - 1]}: {game.homeScore} × {game.awayScore}</span>)}</div> : null}<div className="tw:grid tw:min-w-0 tw:gap-4 tw:min-[700px]:grid-cols-2">{formation(homeName, homePlayers, homeFormation, setHomeFormation, "homePlayerIds")}{formation(awayName, awayPlayers, awayFormation, setAwayFormation, "awayPlayerIds")}</div></> : null}
    <fieldset disabled={pending} className="tw:m-0 tw:grid tw:min-w-0 tw:grid-cols-2 tw:gap-3 tw:border-0 tw:p-0"><label className="tw:grid tw:min-w-0 tw:gap-2 tw:text-xs"><span className="tw:break-words">{homeName}</span><input className={field} name="homeScore" type="number" inputMode="numeric" min={0} max={99} step={1} required aria-label={`Placar de ${homeName}`}/></label><label className="tw:grid tw:min-w-0 tw:gap-2 tw:text-xs"><span className="tw:break-words">{awayName}</span><input className={field} name="awayScore" type="number" inputMode="numeric" min={0} max={99} step={1} required aria-label={`Placar de ${awayName}`}/></label></fieldset>
    <button type="submit" disabled={pending} className="tw:inline-flex tw:min-h-9 tw:w-fit tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-md tw:border-0 tw:bg-[#174983] tw:px-3 tw:py-2 tw:text-xs tw:font-normal tw:text-white tw:hover:bg-[#123b6c] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:disabled:opacity-60 tw:dark:focus-visible:outline-[#a5caff]">{pending ? "Salvando…" : isTrio ? "Salvar jogo" : "Salvar resultado"}</button>
    {feedback ? <p role={feedback.success ? "status" : "alert"} className={`tw:m-0 tw:break-words tw:rounded-md tw:border tw:px-3 tw:py-2 tw:text-sm ${feedback.success ? "tw:border-[#99cfb3] tw:bg-[#edf9f2] tw:text-[#14532d]" : "tw:border-[#e4a3a3] tw:bg-[#fff1f1] tw:text-[#8a1616]"}`}>{feedback.text}</p> : null}
  </form>;
}
