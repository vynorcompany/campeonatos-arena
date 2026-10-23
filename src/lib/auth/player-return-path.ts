import { arenaBookingPath } from "@/lib/arena-booking-path";
/** Only return to a known page of the club used for authentication. */
export function playerReturnPath(arenaSlug: string, returnTo: string) {
  const fallback = `/reservar/${encodeURIComponent(arenaSlug)}`;
  if (!returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.includes("\\")) return fallback;
  try {
    const url = new URL(returnTo, "https://arena.invalid");
    if (url.origin !== "https://arena.invalid") return fallback;
    const allowed = [...["classificacao", "reservar", "checkin"].map(prefix => `/${prefix}/${encodeURIComponent(arenaSlug)}`), arenaBookingPath(arenaSlug)];
    return allowed.includes(url.pathname) ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch { return fallback; }
}
