export type TrioGameResult = { gameNumber: number; homePlayerIds: string[]; awayPlayerIds: string[]; homeScore: number; awayScore: number };
export const trioFormationKey = (ids: string[]) => [...ids].sort().join(":");

export function validateTrioGame(input: TrioGameResult, homeRoster: string[], awayRoster: string[], previous: TrioGameResult[]) {
  if (![1, 2, 3].includes(input.gameNumber)) throw new Error("Jogo inválido do confronto.");
  if (![input.homeScore, input.awayScore].every(value => Number.isInteger(value) && value >= 0 && value <= 99) || input.homeScore === input.awayScore) throw new Error("Informe um placar válido, sem empate.");
  for (const [ids, roster, side] of [[input.homePlayerIds, homeRoster, "mandante"], [input.awayPlayerIds, awayRoster, "visitante"]] as const) {
    if (roster.length !== 3 || new Set(roster).size !== 3 || ids.length !== 2 || new Set(ids).size !== 2 || ids.some(id => !roster.includes(id))) throw new Error(`Selecione dois atletas da equipe ${side}.`);
  }
  const other = previous.filter(game => game.gameNumber !== input.gameNumber);
  if (other.some(game => trioFormationKey(game.homePlayerIds) === trioFormationKey(input.homePlayerIds))) throw new Error("A equipe mandante já usou essa formação neste confronto.");
  if (other.some(game => trioFormationKey(game.awayPlayerIds) === trioFormationKey(input.awayPlayerIds))) throw new Error("A equipe visitante já usou essa formação neste confronto.");
  const next = [...other, input].sort((a, b) => a.gameNumber - b.gameNumber);
  if (next.some((game, index) => game.gameNumber !== index + 1)) throw new Error("Registre os jogos na ordem: ida, volta e desempate.");
  if (next.length === 3 && (next[0].homeScore > next[0].awayScore) === (next[1].homeScore > next[1].awayScore)) throw new Error("O terceiro jogo só é permitido quando ida e volta terminam em 1 a 1.");
  return next;
}
export function summarizeTrioGames(games: TrioGameResult[]) {
  const homeWins = games.filter(game => game.homeScore > game.awayScore).length;
  const awayWins = games.length - homeWins;
  return { homeWins, awayWins, finished: games.length >= 2 && (homeWins === 2 || awayWins === 2), needsDecider: games.length === 2 && homeWins === 1 && awayWins === 1 };
}
