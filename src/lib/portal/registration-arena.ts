/** Accept only the arena identifier; never navigate to a supplied external URL. */
export function registrationArenaSlug(value: string): string | null {
  try {
    const url = new URL(value.trim(), "https://portal.invalid");
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const slug = url.searchParams.get("arena") ??
      (["classificacao", "checkin", "reservar"].includes(parts[0]) ? parts[1] :
        parts[1] === "portaldoatleta" || parts.length === 1 ? parts[0] : "");
    return slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !["home", "portal", "login"].includes(slug) ? slug : null;
  } catch { return null; }
}
