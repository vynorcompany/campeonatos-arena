type Player = { id: string; name: string };
type Side = { name: string; players: { player: Player }[] };
type TrioPublicMatch = { id: string; label: string; stage: string; scheduledTime: string | null; courtName: string | null; homeScore: number | null; awayScore: number | null; homePair: Side | null; awayPair: Side | null; trioGames: { gameNumber: number; homePlayerIds: string[]; awayPlayerIds: string[]; homeScore: number | null; awayScore: number | null }[] };
const formation = (side: Side | null, ids: string[]) => side?.players.filter(({ player }) => ids.includes(player.id)).map(({ player }) => player.name).join(" / ") || "Formação a definir";

export function PublicTrioMatches({ categoryName, matches, knockoutOnly = false }: { categoryName: string; matches: TrioPublicMatch[]; knockoutOnly?: boolean }) {
  const visible = matches.filter(match => !knockoutOnly || match.stage !== "GROUP");
  return <article className="tw:grid tw:min-w-0 tw:gap-3"><h3 className="tw:m-0 tw:text-base tw:font-semibold">{categoryName} · Trio</h3>
    {visible.length ? visible.map(match => <div key={match.id} className="tw:grid tw:min-w-0 tw:gap-2 tw:rounded-md tw:border tw:border-[#c7d8eb] tw:bg-white tw:p-3 tw:text-[#172b45]">
      <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-2"><strong className="tw:text-sm">{match.label}</strong><span className="tw:text-xs">{match.scheduledTime || "Horário a definir"}{match.courtName ? ` · ${match.courtName}` : ""}</span></div>
      <p className="tw:m-0 tw:break-words tw:text-sm"><strong>{match.homePair?.name ?? "A definir"}</strong> <span className="tw:mx-1 tw:font-semibold">{match.homeScore ?? "–"} × {match.awayScore ?? "–"}</span> <strong>{match.awayPair?.name ?? "A definir"}</strong></p>
      {match.homePair && match.awayPair ? <details className="tw:min-w-0 tw:border-t tw:border-[#c7d8eb] tw:pt-2"><summary className="tw:cursor-pointer tw:text-xs tw:text-[#174983]">Jogos e formações</summary><div className="tw:grid tw:min-w-0 tw:gap-2 tw:pt-2">
        {[1,2,...(match.trioGames.some(game => game.gameNumber === 3) || (match.homeScore === 1 && match.awayScore === 1) ? [3] : [])].map(number => { const game = match.trioGames.find(item => item.gameNumber === number);return <div key={number} className="tw:grid tw:min-w-0 tw:gap-1 tw:border-t tw:border-[#d8e3ee] tw:py-2 tw:text-xs"><strong>{number === 1 ? "Ida" : number === 2 ? "Volta" : "Desempate"}</strong><div className="tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] tw:items-start tw:gap-2 tw:max-[560px]:grid-cols-1"><span className="tw:min-w-0 tw:break-words">{formation(match.homePair, game?.homePlayerIds ?? [])}</span><strong>{game?.homeScore ?? "–"} × {game?.awayScore ?? "–"}</strong><span className="tw:min-w-0 tw:break-words">{formation(match.awayPair, game?.awayPlayerIds ?? [])}</span></div></div>;})}
      </div></details> : null}
    </div>) : <p className="tw:m-0 tw:text-sm">{knockoutOnly ? "O mata-mata será definido após os grupos." : "Nenhum confronto publicado."}</p>}
  </article>;
}
