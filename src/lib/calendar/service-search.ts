import { matchesSearch } from "@/lib/clients/name-search";
/** Search words may be separated in the service name. */
export function serviceMatchesSearch(name: string, query: string) {
  return matchesSearch(name, query);
}
