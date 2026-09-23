export type BracketSeed = { home: string | null; away: string | null };

/** Builds a balanced first round and represents automatic advances as byes. */
export function buildCategoryBracketSeeds(registrationIds: string[]): BracketSeed[] {
  if (registrationIds.length < 2) throw new Error("É preciso ao menos 2 inscrições confirmadas para montar o chaveamento.");
  const targetSize = 2 ** Math.ceil(Math.log2(registrationIds.length));
  const padded = [...registrationIds];
  while (padded.length < targetSize) padded.push("");
  const firstRound: BracketSeed[] = [];
  for (let index = 0; index < padded.length / 2; index += 1) firstRound.push({ home: padded[index] || null, away: padded[padded.length - 1 - index] || null });
  return firstRound;
}
