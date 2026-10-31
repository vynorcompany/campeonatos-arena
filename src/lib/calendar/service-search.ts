/** Match names without requiring accents or letter case in the search. */
export function serviceMatchesSearch(name: string, query: string) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  return normalize(name).includes(normalize(query));
}
