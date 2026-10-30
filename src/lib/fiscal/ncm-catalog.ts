import { fiscalCatalogDate, fiscalTableDate } from "./catalog-date";
import catalog from "./catalog/ncm.json";
export const ncmCatalogVersion = catalog.version;
export const ncmCatalogSource = catalog.source;
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const index = catalog.rows.map((row) => ({
  row,
  search: normalize(row.label),
}));
export const ncmIsCurrent = (
  row: (typeof catalog.rows)[number],
  today = fiscalCatalogDate(),
) => fiscalTableDate(row.start) <= today && fiscalTableDate(row.end) >= today;
export function findNcm(code: string) {
  const today = fiscalCatalogDate();
  return catalog.rows.find(
    (row) => row.code === code && ncmIsCurrent(row, today),
  );
}
export function searchNcm(query: string) {
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  const prefix = q.replace(/[.\s]/g, ""),
    today = fiscalCatalogDate(),
    results: { code: string; label: string }[] = [];
  for (const { row, search } of index) {
    if (
      (row.code.startsWith(prefix) || search.includes(q)) &&
      ncmIsCurrent(row, today)
    ) {
      results.push({ code: row.code, label: row.label });
      if (results.length === 12) break;
    }
  }
  return results;
}
