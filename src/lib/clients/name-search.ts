/** Keep spelling/acronyms while capitalizing each name, including hyphenated names. */
export function capitalizeClientName(value: string) {
  return value.trim().replace(/\s+/g, " ").replace(/(^|[\s\-’'])\p{L}/gu, letter => letter.toLocaleUpperCase("pt-BR"));
}
export function searchTerms(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().split(/\s+/).filter(Boolean);
}
/** Every typed word may occur anywhere: Paulo Kaufman matches Paulo Marcelo Kaufman. */
export function matchesSearch(value: string, query: string) {
  const normalized = searchTerms(value).join(" ");
  return searchTerms(query).every(term => normalized.includes(term));
}
