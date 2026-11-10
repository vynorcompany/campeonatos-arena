import { arenaDateInput } from "@/lib/calendar/arena-wall-clock";

export function defaultLedgerFilters(params: Record<string, string | undefined> = {}, now = new Date()) {
  if (params.status === "PENDING") params = {...params,status:"OPEN"};
  // Explicit links and saved filters retain their own scope, including an explicit “all”.
  if (params.ids || params.id || params.focus || params.description || params.name) return params;
  const today = arenaDateInput(now);
  const year = Number(today.slice(0, 4)), month = Number(today.slice(5, 7));
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    ...params,
    ...(params.start === undefined && params.end === undefined ? { start: `${today.slice(0, 7)}-01`, end: `${today.slice(0, 7)}-${last}` } : {}),
    status: params.status === "" ? "ALL" : params.status ?? "OPEN",
  };
}
